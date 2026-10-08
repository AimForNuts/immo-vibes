import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), fetchGuildPage: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("@/lib/services/guild-page.service", () => ({ fetchGuildPage: mocks.fetchGuildPage }));
import { GET } from "@/app/api/idlemmo/guild/[id]/[resource]/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSession.mockResolvedValue({ user: { idlemmoToken: "player-token" } });
});

it("rejects unauthenticated requests before calling IdleMMO", async () => {
  mocks.getSession.mockResolvedValue(null);
  const result = await GET(new NextRequest("https://example.test/api/idlemmo/guild/4/members"),
    { params: Promise.resolve({ id: "4", resource: "members" }) });
  expect(result.status).toBe(401);
  expect(mocks.fetchGuildPage).not.toHaveBeenCalled();
});

it("rejects missing tokens and invalid guild, resource, or page inputs", async () => {
  for (const [id, resource, page] of [["5", "members", "1"], ["4", "unknown", "1"], ["4", "activity", "0"], ["4", "activity", "1.5"]]) {
    const result = await GET(new NextRequest(`https://example.test/api/idlemmo/guild/${id}/${resource}?page=${page}`),
      { params: Promise.resolve({ id, resource }) });
    expect(result.status).toBe(400);
  }
  mocks.getSession.mockResolvedValue({ user: { idlemmoToken: null } });
  const result = await GET(new NextRequest("https://example.test/api/idlemmo/guild/4/members"),
    { params: Promise.resolve({ id: "4", resource: "members" }) });
  expect(result.status).toBe(400);
  expect(mocks.fetchGuildPage).not.toHaveBeenCalled();
});

it("forwards only the session token, requested page, and cancellation signal", async () => {
  const request = new NextRequest("https://example.test/api/idlemmo/guild/4/activity?page=3");
  const upstream = Response.json({ activity: [] }, { headers: { "X-RateLimit-Remaining": "9" } });
  mocks.fetchGuildPage.mockResolvedValue(upstream);
  expect(await GET(request, { params: Promise.resolve({ id: "4", resource: "activity" }) })).toBe(upstream);
  expect(mocks.fetchGuildPage).toHaveBeenCalledWith(4, "activity", 3, "player-token", request.signal);
});
