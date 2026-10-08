import { beforeEach, expect, it, vi } from "vitest";

const queue = vi.hoisted(() => ({ fetch: vi.fn(), getStatus: vi.fn() }));
vi.mock("@/lib/idlemmo-queue", () => ({ idleMmoQueue: queue }));

beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); queue.getStatus.mockReturnValue({ keyId: "player-a" }); });

function members() {
  return Response.json({ guild: { id: 4, name: "YOU", member_count: 1 },
    members: [{ name: "Alice", position: "LEADER", total_level: 100, avatar_url: null }] });
}

function activity(page: number, next: number | null, ids = [page]) {
  return Response.json({ guild: { id: 4, name: "YOU" },
    activity: ids.map((id) => ({ id, type: "CHALLENGE_CONTRIBUTION", character: { name: "Alice", hashed_id: "alice" },
      text: "Contributed", created_ago: "1 hour ago", value: 1, item: null, guild_item: null })),
    pagination: { current_page: page, has_more: next !== null, next_page: next } });
}

it("publishes members and partial history before a delayed next page finishes", async () => {
  const { loadGuildActivity } = await import("@/lib/services/guild-activity-client");
  let finish!: (response: Response) => void;
  queue.fetch.mockResolvedValueOnce(members()).mockResolvedValueOnce(activity(1, 3))
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finish = resolve; }));
  const updates = vi.fn();
  const pending = loadGuildActivity("player-a", 4, "view-1", new AbortController().signal, updates);
  await vi.waitFor(() => expect(queue.fetch).toHaveBeenCalledTimes(3));
  expect(updates.mock.calls.at(-1)?.[0]).toMatchObject({ members: { members: [{ name: "Alice" }] }, nextPage: 3 });
  finish(activity(3, null, [1, 3]));
  await pending;
  expect(updates.mock.calls.at(-1)?.[0].activity.map((entry: { id: number }) => entry.id)).toEqual([1, 3]);
  expect(updates.mock.calls.at(-1)?.[0].nextPage).toBeNull();
});

it("resumes an interrupted history without refetching members or earlier pages", async () => {
  const { loadGuildActivity, getGuildSnapshot } = await import("@/lib/services/guild-activity-client");
  const controller = new AbortController();
  queue.fetch.mockResolvedValueOnce(members()).mockResolvedValueOnce(activity(1, 2));
  await expect(loadGuildActivity("player-a", 4, "view-1", controller.signal, (snapshot) => {
    if (snapshot.nextPage === 2) controller.abort();
  })).rejects.toMatchObject({ name: "AbortError" });
  expect(getGuildSnapshot("player-a", 4).nextPage).toBe(2);
  queue.fetch.mockResolvedValueOnce(activity(2, null));
  await loadGuildActivity("player-a", 4, "view-2", new AbortController().signal, vi.fn());
  expect(queue.fetch.mock.calls.at(-1)?.[0]).toContain("activity?page=2");
  expect(queue.fetch).toHaveBeenCalledTimes(3);
});

it("does not apply an old-key response or share its snapshot with another key", async () => {
  const { loadGuildActivity, getGuildSnapshot } = await import("@/lib/services/guild-activity-client");
  queue.fetch.mockImplementationOnce(() => { queue.getStatus.mockReturnValue({ keyId: "player-b" }); return members(); });
  await expect(loadGuildActivity("player-a", 4, "view-1", new AbortController().signal, vi.fn()))
    .rejects.toMatchObject({ name: "AbortError" });
  expect(getGuildSnapshot("player-a", 4).members).toBeNull();
  expect(getGuildSnapshot("player-b", 4).members).toBeNull();
});

it("keeps loaded rows and the resume cursor when a later request fails", async () => {
  const { loadGuildActivity, getGuildSnapshot } = await import("@/lib/services/guild-activity-client");
  queue.fetch.mockResolvedValueOnce(members()).mockResolvedValueOnce(activity(1, 2))
    .mockResolvedValueOnce(Response.json({ message: "Quota unavailable" }, { status: 429 }));
  await expect(loadGuildActivity("player-a", 4, "view-1", new AbortController().signal, vi.fn()))
    .rejects.toThrow("Quota unavailable");
  expect(getGuildSnapshot("player-a", 4)).toMatchObject({ nextPage: 2, activity: [{ id: 1 }] });
});

it("reuses a recently completed snapshot without spending more API quota", async () => {
  const { loadGuildActivity } = await import("@/lib/services/guild-activity-client");
  queue.fetch.mockResolvedValueOnce(members()).mockResolvedValueOnce(activity(1, null));
  await loadGuildActivity("player-a", 4, "view-1", new AbortController().signal, vi.fn());
  await loadGuildActivity("player-a", 4, "view-2", new AbortController().signal, vi.fn());
  expect(queue.fetch).toHaveBeenCalledTimes(2);
});

it("rejects malformed entries and non-advancing pagination before applying them", async () => {
  const { parseGuildResponse } = await import("@/lib/services/guild-activity-client");
  const invalid = await activity(1, 1).json();
  expect(() => parseGuildResponse(invalid, 4, "activity")).toThrow("pagination");
  invalid.pagination.has_more = false;
  invalid.activity[0].character = null;
  expect(() => parseGuildResponse(invalid, 4, "activity")).toThrow();
});
