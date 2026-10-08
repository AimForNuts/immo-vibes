export interface QueueStatus {
  remaining: number | null;
  resetAt: number;
  queueSize: number;
  throttled: boolean;
  keyId: string | null;
}

interface QueueEntry {
  url: string;
  tag: string;
  keyId: string | null;
  dedupeKey: string | null;
  controller: AbortController;
  resolve: (r: Response) => void;
  reject: (e: unknown) => void;
  cancelled: boolean;
}

class IdleMmoQueue {
  private keyId: string | null = null;
  private remaining: number | null = null;
  private resetAt = 0;
  private throttled = false;
  private queue: QueueEntry[] = [];
  private inFlight: QueueEntry[] = [];
  private processing = false;
  private subscribers = new Set<(s: QueueStatus) => void>();
  private deduped = new Map<string, Promise<Response>>();

  onStatusChange: ((s: QueueStatus) => void) | null = null;

  getStatus(): QueueStatus {
    return {
      remaining: this.remaining,
      resetAt: this.resetAt,
      queueSize: this.queue.length,
      throttled: this.throttled,
      keyId: this.keyId,
    };
  }

  subscribe(callback: (s: QueueStatus) => void) {
    this.subscribers.add(callback);
    callback(this.getStatus());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  setApiKey(keyId: string | null) {
    if (this.keyId === keyId) return;
    this.keyId = keyId;
    this.remaining = null;
    this.resetAt = 0;
    this.throttled = false;
    this.deduped.clear();
    for (const entry of this.queue) {
      entry.cancelled = true;
      entry.controller.abort();
    }
    for (const entry of this.inFlight) entry.controller.abort();
    this.notifyStatus();
  }

  fetch(url: string, tag: string, options: { dedupeKey?: string } = {}): Promise<Response> {
    const dedupeKey = options.dedupeKey ?? null;
    if (dedupeKey) {
      const existing = this.deduped.get(dedupeKey);
      if (existing) return existing.then((response) => response.clone());
    }

    const promise = new Promise<Response>((resolve, reject) => {
      const controller = new AbortController();
      this.queue.push({
        url,
        tag,
        keyId: this.keyId,
        dedupeKey,
        controller,
        resolve,
        reject,
        cancelled: false,
      });
      this.notifyStatus();
      if (!this.processing) this.process();
    });

    if (!dedupeKey) return promise;

    this.deduped.set(dedupeKey, promise);
    promise.finally(() => this.deduped.delete(dedupeKey)).catch(() => {});
    return promise.then((response) => response.clone());
  }

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

  private notifyStatus() {
    const status = this.getStatus();
    this.onStatusChange?.(status);
    for (const subscriber of this.subscribers) subscriber(status);
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

      if (this.remaining !== null && this.remaining <= 0) {
        this.throttled = true;
        this.notifyStatus();
        const waitMs = Math.max(1000, this.resetAt * 1000 - Date.now() + 500);
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        this.throttled = false;
      }

      this.drainCancelled();
      if (this.queue.length === 0) break;

      const entry = this.queue.shift()!;
      if (entry.keyId !== this.keyId) {
        entry.reject(new DOMException("API key changed before dispatch", "AbortError"));
        continue;
      }

      this.inFlight.push(entry);
      this.notifyStatus();

      try {
        const res = await fetch(entry.url, { signal: entry.controller.signal });

        if (entry.keyId !== this.keyId) {
          await res.body?.cancel();
          entry.reject(new DOMException("API key changed before response", "AbortError"));
          continue;
        }

        const remaining = res.headers.get("X-RateLimit-Remaining");
        const reset = res.headers.get("X-RateLimit-Reset");
        if (remaining !== null) this.remaining = Number.parseInt(remaining, 10);
        if (reset !== null) this.resetAt = Number.parseInt(reset, 10);
        if (res.status === 429) this.remaining = 0;

        entry.resolve(res);
      } catch (error) {
        entry.reject(error);
      } finally {
        this.inFlight = this.inFlight.filter((item) => item !== entry);
        this.notifyStatus();
      }
    }

    this.processing = false;
    this.notifyStatus();
  }
}

export const idleMmoQueue = new IdleMmoQueue();
export type { QueueStatus as IdleMmoQueueStatus };
