# IdleMMO API — Rate Limiting

## How the API communicates limits

Every response from `api.idle-mmo.com` includes:

| Header | Type | Meaning |
|---|---|---|
| `X-RateLimit-Remaining` | integer | Requests left in the current window |
| `X-RateLimit-Reset` | integer (Unix epoch seconds) | When the window resets and remaining refills |

There is no hard-coded quota. These headers are the only source of truth.

## Coordinator model

IdleMMO limits requests per player's API key, so the app coordinates one queue per API-key fingerprint rather than one global queue across every player.

- Browser calls use the session-level singleton in `lib/idlemmo-queue.ts`.
- Server calls that go through `lib/idlemmo.ts`, live market fallback, API Inspector, and raw/admin probe routes use `lib/idlemmo-rate-limit.ts`.
- The key identifier is a short SHA-256 fingerprint; raw API keys are not persisted in D1 for rate-limit tracking.
- D1 reads/writes do not consume IdleMMO API queue slots.
- Persisting rate-limit snapshots in D1 was not added because it would not enforce quota across browser tabs, workers, or cron executions.

## Required behaviour for all API callers

```
BEFORE each request:
  if remaining is known AND remaining ≤ 0:
    wait = max(1000ms, resetAt × 1000 − now + 500ms)
    sleep(wait)

MAKE request

READ headers from every response:
  remaining = X-RateLimit-Remaining  (if present)
  resetAt   = X-RateLimit-Reset      (if present)

IF status == 429:
  remaining = 0                       # force wait before next attempt
  wait = max(1000ms, resetAt × 1000 − now + 500ms)
  sleep(wait)
  retry same request (up to MAX_RETRIES = 10)

IF status != 200 and != 429:
  do NOT retry — skip the item, continue loop
```

### Rules

1. **Never hardcode remaining/quota.** `remaining` starts as `null` (unknown) and is only ever set from a response header.
2. **Always retry on 429 — but cap retries.** `MAX_RETRIES = 10`. After 10 consecutive 429s throw an error; do not loop forever.
3. **Use an iterative loop, not recursion.** Recursive retry functions have no natural cap and cause double-waits on every 429.
4. **500ms buffer on reset time.** `resetAt × 1000 − now + 500` gives half a second of margin before the window refills.
5. **Minimum wait of 1000ms.** Protects against malformed/missing headers or a reset time already in the past.
6. **Share rate-limit state across the loop.** One `rl` object per sync run so the remaining count stays accurate across all items.

## Reference implementation

Used in `app/api/admin/sync-prices/route.ts`:

```typescript
const MAX_RETRIES = 10;
const rl = { remaining: null as number | null, resetAt: 0 };

async function rateLimitedFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (rl.remaining !== null && rl.remaining <= 0) {
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await sleep(waitMs);
    }

    const res = await fetch(url, { headers, cache: "no-store" });
    const rem = res.headers.get("x-ratelimit-remaining");
    const rst = res.headers.get("x-ratelimit-reset");
    if (rem !== null) rl.remaining = parseInt(rem, 10);
    if (rst !== null) rl.resetAt   = parseInt(rst, 10);

    if (res.status !== 429) return res;

    // 429 — wait exactly as long as the API instructs, then retry
    rl.remaining = 0;
    const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
    await sleep(waitMs);
  }

  throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
}
```

## Observed throughput

- Rate limit window resets approximately every **60 seconds**
- Approximately **20 requests** allowed per window
- After hitting 429, the API typically needs **~57–58 seconds** to reset
- Effective throughput: ~20 items/minute

### Batch sizing implications

| Items in type | Est. time | Operational fit |
|---|---|---|
| ≤ 80 | ≤ 4 min | Good default |
| ~100 | ~5 min | Borderline |
| ≥ 120 | > 6 min | Split across requests |

Types above ~100 items (e.g. `CHEST` 158, `RECIPE` 370) should be split across paginated requests. The limiting factor is the IdleMMO API rate window plus keeping Cloudflare Worker requests short enough to debug and retry cleanly.

## Browser navigation

Browser page views should enqueue IdleMMO proxy requests through the singleton queue with a page tag, for example `"gear"`, `"dungeons"`, or `"combat"`.

- New requests are appended FIFO.
- Unmounted page effects call `cancelByTag(tag)` so waiting requests are removed and in-flight fetches are aborted where supported.
- The queue is configured from the dashboard layout and survives client-side navigation.
- When the active API key fingerprint changes, queued and in-flight requests from the old key are aborted and their results are rejected.
- Consumers should keep their own stale-response guard before applying results to component state.

## Scheduled and server flows

Server-side callers must respect the same per-key quota:

- Shared server client calls use `rateLimitedIdleMmoFetch(token, url, init)`, which serializes dispatch per API-key fingerprint and updates state from `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`.
- Existing admin/cron sync routes that maintain route-local rate-limit state coordinate within that sync run and use the active admin/cron API key's headers. They are not mixed with browser queue state.
- Scheduled jobs can overlap with browser activity for the same API key because the current implementation is intentionally in-process/session scoped. Use Durable Objects or another shared server coordinator only if observed multi-context contention makes it necessary.

## Applies to

All routes and scripts that call the IdleMMO API in a loop:

| File | Pattern |
|---|---|
| `lib/idlemmo-rate-limit.ts` | Central server-side per-key coordinator |
| `lib/idlemmo-queue.ts` | Session-level browser queue |
| `app/api/admin/sync-prices/route.ts` | Inline route-local coordinator for the sync run |
| `app/api/admin/sync-inspect/route.ts` | Inline route-local coordinator for the sync run |
| `app/api/admin/sync-recipes/route.ts` | Inline route-local coordinator for the sync run |
| `app/api/cron/sync-prices/route.ts` | Inline route-local coordinator for the scheduled sync run |
| `app/api/cron/sync-recipes/route.ts` | Inline route-local coordinator for the scheduled sync run |
