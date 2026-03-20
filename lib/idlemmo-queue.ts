/**
 * Global client-side request queue for all IdleMMO API proxy calls.
 *
 * - Reads the user's API key rate limit once from /api/idlemmo/auth-check
 *   (defaults to 20 req/min until the check resolves).
 * - Enforces the limit with a sliding-window algorithm — dispatches as fast as
 *   possible, then waits until the oldest timestamp falls out of the 60-second
 *   window before firing more.
 * - Supports tag-based cancellation: call cancelByTag(tag) to abort all queued
 *   AND in-flight requests with that tag, so tab switches don't waste quota.
 *
 * Usage:
 *   idleMmoQueue.init();                          // call once on mount
 *   const res = await idleMmoQueue.fetch(url, tag);
 *   idleMmoQueue.cancelByTag("prices:resources"); // on tab switch
 */

interface QueueEntry {
  url:        string;
  tag:        string;
  controller: AbortController;
  resolve:    (r: Response) => void;
  reject:     (e: Error) => void;
  cancelled:  boolean;
}

class IdleMmoQueue {
  /** Requests allowed per windowMs. Overridden by init(). */
  private rateLimit   = 20;
  private windowMs    = 60_000;

  /** Dispatch timestamps within the current window (sliding). */
  private timestamps: number[] = [];

  /** Pending entries not yet dispatched. */
  private queue: QueueEntry[] = [];

  /** Entries already dispatched (in-flight). Tracked for tag-based abort. */
  private inFlight: QueueEntry[] = [];

  private processing  = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Fetch the user's rate limit from /api/idlemmo/auth-check.
   * Safe to call multiple times — returns the same promise on subsequent calls.
   * Silently falls back to 20 req/min on failure.
   */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = fetch("/api/idlemmo/auth-check")
      .then((r) => r.json())
      .then((d: { rate_limit?: number }) => {
        if (typeof d.rate_limit === "number" && d.rate_limit > 0) {
          this.rateLimit = d.rate_limit;
        }
      })
      .catch(() => { /* keep default 20 req/min */ });
    return this.initPromise;
  }

  /**
   * Enqueue a GET request to one of our /api/* proxy routes.
   * Returns a Response promise. The request is dispatched when the rate-limit
   * window has an available slot.
   *
   * @param url  The URL to fetch.
   * @param tag  Logical group — cancelByTag(tag) aborts all entries with this tag.
   */
  fetch(url: string, tag: string): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const controller = new AbortController();
      const entry: QueueEntry = { url, tag, controller, resolve, reject, cancelled: false };
      this.queue.push(entry);
      if (!this.processing) this.process();
    });
  }

  /**
   * Abort all entries with the given tag — both queued (not yet dispatched)
   * and in-flight (already sent). Queued entries are rejected with AbortError;
   * in-flight ones have their AbortController signalled.
   */
  cancelByTag(tag: string) {
    for (const entry of this.queue) {
      if (entry.tag === tag && !entry.cancelled) {
        entry.cancelled = true;
        entry.controller.abort();
      }
    }
    for (const entry of this.inFlight) {
      if (entry.tag === tag) {
        entry.controller.abort();
      }
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private msUntilSlot(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
    if (this.timestamps.length < this.rateLimit) return 0;
    return Math.max(0, this.timestamps[0] + this.windowMs - now + 50);
  }

  private async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      // Skip cancelled entries at the head of the queue
      while (this.queue.length > 0 && this.queue[0].cancelled) {
        this.queue.shift()!.reject(new DOMException("Request cancelled", "AbortError"));
      }
      if (this.queue.length === 0) break;

      const wait = this.msUntilSlot();
      if (wait > 0) {
        await new Promise<void>((r) => setTimeout(r, wait));
        continue;
      }

      const entry = this.queue.shift()!;
      if (entry.cancelled) {
        entry.reject(new DOMException("Request cancelled", "AbortError"));
        continue;
      }

      this.inFlight.push(entry);
      this.timestamps.push(Date.now());

      // Dispatch without awaiting — rate limit tracks dispatch time, not completion
      fetch(entry.url, { signal: entry.controller.signal })
        .then(entry.resolve)
        .catch((e: unknown) => entry.reject(e instanceof Error ? e : new Error(String(e))))
        .finally(() => {
          this.inFlight = this.inFlight.filter((e) => e !== entry);
        });
    }

    this.processing = false;
  }
}

/** One queue instance per browser session. */
export const idleMmoQueue = new IdleMmoQueue();
