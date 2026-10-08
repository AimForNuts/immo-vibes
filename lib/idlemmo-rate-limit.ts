const MAX_RETRIES = 10;
const RESET_BUFFER_MS = 500;
const MIN_WAIT_MS = 1000;

export interface IdleMmoRateLimitSnapshot {
  keyId: string;
  remaining: number | null;
  resetAt: number;
  updatedAt: number;
}

interface CoordinatorState {
  tail: Promise<void>;
  snapshot: IdleMmoRateLimitSnapshot;
}

const serverCoordinators = new Map<string, CoordinatorState>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseIntegerHeader(value: string | null) {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getWaitMs(resetAt: number) {
  return Math.max(MIN_WAIT_MS, resetAt * 1000 - Date.now() + RESET_BUFFER_MS);
}

export async function getIdleMmoApiKeyId(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest.slice(0, 12)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function forwardIdleMmoRateLimitHeaders(from: Response, to: Response) {
  const remaining = from.headers.get("x-ratelimit-remaining");
  const reset = from.headers.get("x-ratelimit-reset");
  const retryAfter = from.headers.get("retry-after");
  if (remaining !== null) to.headers.set("X-RateLimit-Remaining", remaining);
  if (reset !== null) to.headers.set("X-RateLimit-Reset", reset);
  if (retryAfter !== null) to.headers.set("Retry-After", retryAfter);
}

export function forwardIdleMmoRateLimitSnapshot(snapshot: IdleMmoRateLimitSnapshot | null, to: Response) {
  if (!snapshot) return;
  if (snapshot.remaining !== null) to.headers.set("X-RateLimit-Remaining", String(snapshot.remaining));
  if (snapshot.resetAt) to.headers.set("X-RateLimit-Reset", String(snapshot.resetAt));
}

export async function getIdleMmoRateLimitSnapshot(token: string) {
  return serverCoordinators.get(await getIdleMmoApiKeyId(token))?.snapshot ?? null;
}

export async function rateLimitedIdleMmoFetch(
  token: string,
  input: string,
  init: RequestInit & { next?: { revalidate?: number } } = {}
): Promise<Response> {
  const keyId = await getIdleMmoApiKeyId(token);
  let state = serverCoordinators.get(keyId);
  if (!state) {
    state = {
      tail: Promise.resolve(),
      snapshot: { keyId, remaining: null, resetAt: 0, updatedAt: 0 },
    };
    serverCoordinators.set(keyId, state);
  }

  const run = async () => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (state.snapshot.remaining !== null && state.snapshot.remaining <= 0) {
        await sleep(getWaitMs(state.snapshot.resetAt));
      }

      const res = await fetch(input, init);
      const remaining = parseIntegerHeader(res.headers.get("x-ratelimit-remaining"));
      const resetAt = parseIntegerHeader(res.headers.get("x-ratelimit-reset"));
      state.snapshot = {
        keyId,
        remaining: remaining ?? state.snapshot.remaining,
        resetAt: resetAt ?? state.snapshot.resetAt,
        updatedAt: Date.now(),
      };

      if (res.status !== 429) return res;

      state.snapshot = { ...state.snapshot, remaining: 0 };
      if (attempt >= MAX_RETRIES) return res;

      const retryAfter = parseIntegerHeader(res.headers.get("retry-after"));
      await res.body?.cancel();
      await sleep(retryAfter !== null ? Math.max(MIN_WAIT_MS, retryAfter * 1000) : getWaitMs(state.snapshot.resetAt));
    }

    throw new Error("IdleMMO API returned persistent 429");
  };

  const next = state.tail.then(run, run);
  state.tail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
