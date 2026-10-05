import { afterEach, expect, it, vi } from "vitest";
import { getAllGuildActivity } from "@/lib/services/guild-activity.service";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

function response(page: number, next: number | null, remaining = 10) {
  return new Response(JSON.stringify({
    guild: { id: 4, name: "YOU" },
    activity: [{ id: 1 }, { id: page + 1 }],
    pagination: { current_page: page, has_more: next !== null, next_page: next },
  }), { headers: { "x-ratelimit-remaining": String(remaining), "x-ratelimit-reset": "60" } });
}

it("follows next_page, deduplicates entries, and stops at the final page", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(response(1, 3)).mockResolvedValueOnce(response(3, null));
  vi.stubGlobal("fetch", fetch);
  const result = await getAllGuildActivity(4, "token");
  expect(result.ok && result.data.activity.map((entry) => entry.id)).toEqual([1, 2, 4]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][0]).toContain("page=3");
});

it("waits for reset before requesting another page", async () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  const fetch = vi.fn().mockResolvedValueOnce(response(1, 2, 0)).mockResolvedValueOnce(response(2, null));
  vi.stubGlobal("fetch", fetch);
  const pending = getAllGuildActivity(4, "token");
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(500);
  expect((await pending).ok).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("retries the same page after a 429", async () => {
  vi.useFakeTimers(); vi.setSystemTime(0);
  const fetch = vi.fn().mockResolvedValueOnce(new Response("{}", { status: 429 }))
    .mockResolvedValueOnce(response(1, null));
  vi.stubGlobal("fetch", fetch);
  const pending = getAllGuildActivity(4, "token");
  await vi.advanceTimersByTimeAsync(1000);
  expect((await pending).ok).toBe(true);
  expect(fetch.mock.calls[0][0]).toBe(fetch.mock.calls[1][0]);
});

it("rejects non-advancing pagination without returning partial activity", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(1, 1)));
  expect(await getAllGuildActivity(4, "token")).toMatchObject({ ok: false, status: 502 });
});
