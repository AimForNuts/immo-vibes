import { beforeEach, describe, expect, it, vi } from "vitest";

type PriceRow = {
  price: number;
  soldAt: Date;
  quantity: number;
};

type ItemPriceRow = {
  lastSoldPrice: number | null;
  lastSoldAt: Date | null;
};

function makeRequest(tier?: string) {
  const url = new URL("https://example.test/api/market/price/item-1");
  if (tier) url.searchParams.set("tier", tier);
  return { nextUrl: url };
}

async function loadRoute(options: {
  session?: unknown;
  historyRow?: PriceRow | null;
  itemRow?: ItemPriceRow | null;
  insertMarketPriceHistory?: ReturnType<typeof vi.fn>;
}) {
  vi.resetModules();
  const getLatestMarketPrice = vi.fn(async () => options.historyRow ?? null);
  const getItemById = vi.fn(async () => options.itemRow ?? null);
  const insertMarketPriceHistory = options.insertMarketPriceHistory ?? vi.fn(async () => undefined);

  vi.doMock("next/headers", () => ({
    headers: vi.fn(async () => new Headers()),
  }));
  vi.doMock("@/lib/auth", () => ({
    auth: {
      api: {
        getSession: vi.fn(async () => options.session ?? {
          user: { idlemmoToken: "token" },
        }),
      },
    },
  }));
  vi.doMock("@/lib/services/market-price-history.service", () => ({
    getLatestMarketPrice,
    insertMarketPriceHistory,
  }));
  vi.doMock("@/lib/services/items.service", () => ({
    getItemById,
  }));

  const route = await import("@/app/api/market/price/[id]/route");
  return { GET: route.GET, getLatestMarketPrice, getItemById, insertMarketPriceHistory };
}

async function readJson(response: Response) {
  return response.json() as Promise<unknown>;
}

describe("market price route fallback and cache behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("serves the latest matching tier from market price history before fallbacks", async () => {
    const soldAt = new Date("2026-01-02T03:04:05.000Z");
    const { GET, getLatestMarketPrice } = await loadRoute({
      historyRow: { price: 1234, soldAt, quantity: 2 } satisfies PriceRow,
    });

    const response = await GET(
      makeRequest("3") as never,
      { params: Promise.resolve({ id: "item-1" }) }
    );

    expect(await readJson(response)).toEqual({
      price: 1234,
      sold_at: soldAt.toISOString(),
      quantity: 2,
    });
    expect(getLatestMarketPrice).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to items.last_sold_price for tier 1 cache misses", async () => {
    const soldAt = new Date("2026-02-03T04:05:06.000Z");
    const { GET, getLatestMarketPrice, getItemById } = await loadRoute({
      historyRow: null,
      itemRow: { lastSoldPrice: 9876, lastSoldAt: soldAt } satisfies ItemPriceRow,
    });

    const response = await GET(
      makeRequest("1") as never,
      { params: Promise.resolve({ id: "item-1" }) }
    );

    expect(await readJson(response)).toEqual({
      price: 9876,
      sold_at: soldAt.toISOString(),
      quantity: null,
    });
    expect(getLatestMarketPrice).toHaveBeenCalledTimes(1);
    expect(getItemById).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and persists a tier greater than 1 when the DB cache misses", async () => {
    const insertMarketPriceHistory = vi.fn(async () => undefined);
    const soldAt = "2026-03-04T05:06:07.000Z";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      latest_sold: [
        { tier: 1, price_per_item: 100, quantity: 9, sold_at: "2026-01-01T00:00:00.000Z" },
        { tier: 4, price_per_item: 4444, quantity: 3, sold_at: soldAt },
      ],
    }), { status: 200 })));

    const { GET } = await loadRoute({
      historyRow: null,
      insertMarketPriceHistory,
    });

    const response = await GET(
      makeRequest("4") as never,
      { params: Promise.resolve({ id: "item-1" }) }
    );

    expect(await readJson(response)).toEqual({
      price: 4444,
      sold_at: soldAt,
      quantity: 3,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.idle-mmo.com/v1/item/item-1/market-history?tier=1&type=listings",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
        cache: "no-store",
      })
    );
    expect(insertMarketPriceHistory).toHaveBeenCalledWith(expect.objectContaining({
      itemHashedId: "item-1",
      tier: 4,
      price: 4444,
      quantity: 3,
      soldAt: new Date(soldAt),
    }));
  });

  it("does not fetch live tier prices when the signed-in user has no IdleMMO token", async () => {
    const { GET } = await loadRoute({
      session: { user: { idlemmoToken: null } },
      historyRow: null,
    });

    const response = await GET(
      makeRequest("5") as never,
      { params: Promise.resolve({ id: "item-1" }) }
    );

    expect(await readJson(response)).toEqual({
      price: null,
      sold_at: null,
      quantity: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
