/**
 * Global client-side request queue for all IdleMMO API proxy calls.
 *
 * Strategy:
 *   - Requests are dispatched ONE AT A TIME (sequential). We await each
 *     response before firing the next, so the X-RateLimit-* headers are
 *     always up-to-date before the next slot decision.
 *   - Before each dispatch we check `remaining`. If it is 0 we sleep until
 *     `resetAt * 1000 + 150 ms` so we never fire into an exhausted window.
 *   - Tag-based cancellation: cancelByTag(tag) aborts queued and in-flight
 *     requests matching that tag.
 *
 * Proxy routes must forward the IdleMMO X-RateLimit-Remaining and
 * X-RateLimit-Reset response headers so the queue can read them.
 */

export interface QueueStatus {
  /** Requests left in the current IdleMMO rate-limit window (from headers). */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets. 0 if unknown. */
  resetAt: number;
  /** Number of requests still waiting to be dispatched. */
  queueSize: number;
  /** True while sleeping until the rate-limit window resets. */
  throttled: boolean;
}

interface QueueEntry {
  url:        string;
  tag:        string;
  controller: AbortController;
  resolve:    (r: Response) => void;
  reject:     (e: unknown) => void;
  cancelled:  boolean;
}

class IdleMmoQueue {
  /** Optimistic default — overridden by the first response headers. */
  private remaining  = 20;
  private resetAt    = 0;  // unix seconds
  private throttled  = false;

  private queue:    QueueEntry[] = [];
  private inFlight: QueueEntry[] = [];
  private processing = false;

  /** Subscribe to queue state changes for UI indicators. */
  onStatusChange: ((s: QueueStatus) => void) | null = null;

  getStatus(): QueueStatus {
    return {
      remaining: this.remaining,
      resetAt:   this.resetAt,
      queueSize: this.queue.length,
      throttled: this.throttled,
    };
  }

  /**
   * Enqueue a GET request to one of our /api/* proxy routes.
   * Returns a Response promise dispatched when a rate-limit slot is available.
   */
  fetch(url: string, tag: string): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const controller = new AbortController();
      this.queue.push({ url, tag, controller, resolve, reject, cancelled: false });
      this.notifyStatus();
      if (!this.processing) this.process();
    });
  }

  /**
   * Abort all entries (queued or in-flight) with the given tag.
   * Queued entries are rejected with AbortError; in-flight ones are aborted
   * via their AbortController (the fetch rejects and the queue moves on).
   */
  cancelByTag(tag: string) {
    for (const entry of this.queue) {
      if (entry.tag === tag && !entry.cancelled) {
        entry.cancelled = true;
        entry.controller.abort();
      }
    }
    for (const entry of this.inFlight) {
      if (entry.tag === tag) entry.controller.abort();
    }
    this.notifyStatus();
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private notifyStatus() {
    this.onStatusChange?.(this.getStatus());
  }

  private drainCancelled() {
    while (this.queue.length > 0 && this.queue[0].cancelled) {
      this.queue.shift()!.reject(new DOMException("Request cancelled", "AbortError"));
    }
  }

  private async process() {
    this.processing = true;

    while (this.queue.length > 0) {
      this.drainCancelled();
      if (this.queue.length === 0) break;

      // Wait if the rate-limit window is exhausted
      if (this.remaining <= 0) {
        this.throttled = true;
        this.notifyStatus();
        const waitMs = Math.max(150, this.resetAt * 1000 - Date.now() + 150);
        await new Promise<void>((r) => setTimeout(r, waitMs));
        this.remaining = 20; // optimistic reset — overwritten by next response
        this.throttled = false;
      }

      this.drainCancelled();
      if (this.queue.length === 0) break;

      const entry = this.queue.shift()!;
      this.inFlight.push(entry);
      this.remaining = Math.max(0, this.remaining - 1);
      this.notifyStatus();

      // Sequential: await the response before processing the next entry
      try {
        const res = await fetch(entry.url, { signal: entry.controller.signal });

        // Update rate-limit state from headers forwarded by our proxy
        const rem = res.headers.get("X-RateLimit-Remaining");
        const rst = res.headers.get("X-RateLimit-Reset");
        if (rem !== null) this.remaining = parseInt(rem, 10);
        if (rst !== null) this.resetAt   = parseInt(rst, 10);

        // If we still hit a 429, mark exhausted so next dispatch waits
        if (res.status === 429) this.remaining = 0;

        entry.resolve(res);
      } catch (e) {
        entry.reject(e);
      } finally {
        this.inFlight = this.inFlight.filter((e) => e !== entry);
        this.notifyStatus();
      }
    }

    this.processing = false;
    this.notifyStatus();
  }
}

/** One queue instance per browser session. */
export const idleMmoQueue = new IdleMmoQueue();
export type { QueueStatus as IdleMmoQueueStatus };
