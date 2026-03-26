import { describe, it, expect, vi, afterEach } from "vitest";
import { RateLimitError, searchItemsByTypePage } from "@/lib/idlemmo";

afterEach(() => vi.unstubAllGlobals());

// ─── RateLimitError ───────────────────────────────────────────────────────────

describe("RateLimitError", () => {
  it("is an instance of Error", () => {
    expect(new RateLimitError(5000)).toBeInstanceOf(Error);
  });

  it("sets retryAfterMs from constructor", () => {
    expect(new RateLimitError(5000).retryAfterMs).toBe(5000);
  });

  it("has name 'RateLimitError'", () => {
    expect(new RateLimitError(5000).name).toBe("RateLimitError");
  });

  it("instanceof check works", () => {
    expect(new RateLimitError(1000) instanceof RateLimitError).toBe(true);
  });
});

// ─── searchItemsByTypePage — 429 ──────────────────────────────────────────────

describe("searchItemsByTypePage — 429 handling", () => {
  it("throws RateLimitError when API returns 429", async () => {
    const resetAt = Math.floor(Date.now() / 1000) + 60;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: { get: (h: string) => h === "x-ratelimit-reset" ? String(resetAt) : null },
    }));

    await expect(searchItemsByTypePage("SWORD", 1, "token")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("retryAfterMs is at least 1000ms", async () => {
    const resetAt = Math.floor(Date.now() / 1000) + 60;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: { get: (h: string) => h === "x-ratelimit-reset" ? String(resetAt) : null },
    }));

    const err = await searchItemsByTypePage("SWORD", 1, "token").catch((e) => e);
    expect(err.retryAfterMs).toBeGreaterThanOrEqual(1000);
  });

  it("uses 1000ms minimum when reset header is absent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429,
      ok: false,
      headers: { get: () => null },
    }));

    const err = await searchItemsByTypePage("SWORD", 1, "token").catch((e) => e);
    expect(err.retryAfterMs).toBe(1000);
  });

  it("returns rl.remaining and rl.resetAt from headers on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: {
        get: (h: string) => {
          if (h === "x-ratelimit-remaining") return "14";
          if (h === "x-ratelimit-reset") return "1711490000";
          return null;
        },
      },
      json: async () => ({ items: [], pagination: { current_page: 1, last_page: 1 } }),
    }));

    const result = await searchItemsByTypePage("SWORD", 1, "token");
    expect(result.rl.remaining).toBe(14);
    expect(result.rl.resetAt).toBe(1711490000);
  });

  it("sets rl.remaining to null when header is absent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => null },
      json: async () => ({ items: [], pagination: { current_page: 1, last_page: 1 } }),
    }));

    const result = await searchItemsByTypePage("SWORD", 1, "token");
    expect(result.rl.remaining).toBeNull();
  });
});
