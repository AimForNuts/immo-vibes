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

function mockSelectQueue(rowsQueue: unknown[][]) {
  const limit = vi.fn(() => rowsQueue.shift() ?? []);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy, limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select, from, where, orderBy, limit };
}

function mockInsert() {
  const onConflictDoNothing = vi.fn(async () => undefined);
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  return { insert, values, onConflictDoNothing };
}

async function loadRoute(options: {
  session?: unknown;
  selectRows?: unknown[][];
  insertMock?: ReturnType<typeof mockInsert>;
}) {
  vi.resetModules();
  const selectMock = mockSelectQueue(options.selectRows ?? []);
  const insertMock = options.insertMock ?? mockInsert();

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
  vi.doMock("@/lib/db", () => ({
    db: {
      select: selectMock.select,
      insert: insertMock.insert,
    },
  }));

  const route = await import("@/app/api/market/price/[id]/route");
  return { GET: route.GET, selectMock, insertMock };
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
    const { GET, selectMock } = await loadRoute({
      selectRows: [[{ price: 1234, soldAt, quantity: 2 } satisfies PriceRow]],
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
    expect(selectMock.select).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to items.last_sold_price for tier 1 cache misses", async () => {
    const soldAt = new Date("2026-02-03T04:05:06.000Z");
    const { GET, selectMock } = await loadRoute({
      selectRows: [
        [],
        [{ lastSoldPrice: 9876, lastSoldAt: soldAt } satisfies ItemPriceRow],
      ],
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
    expect(selectMock.select).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches and persists a tier greater than 1 when the DB cache misses", async () => {
    const insertMock = mockInsert();
    const soldAt = "2026-03-04T05:06:07.000Z";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      latest_sold: [
        { tier: 1, price_per_item: 100, quantity: 9, sold_at: "2026-01-01T00:00:00.000Z" },
        { tier: 4, price_per_item: 4444, quantity: 3, sold_at: soldAt },
      ],
    }), { status: 200 })));

    const { GET } = await loadRoute({
      selectRows: [[]],
      insertMock,
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
    expect(insertMock.values).toHaveBeenCalledWith(expect.objectContaining({
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
      selectRows: [[]],
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
