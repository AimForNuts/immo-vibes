import { randomUUID } from "crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketPriceHistory } from "@/lib/db/schema";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type MarketPriceHistoryCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type MarketPriceHistoryD1Row = {
  id: string;
  item_hashed_id: string;
  tier: number;
  price: number;
  quantity: number;
  sold_at: string;
  recorded_at: string;
};

export type MarketPriceHistoryEntry = {
  id: string;
  itemHashedId: string;
  tier: number;
  price: number;
  quantity: number;
  soldAt: Date;
  recordedAt: Date;
};

export type MarketPriceHistoryInput = {
  itemHashedId: string;
  tier: number;
  price: number;
  quantity?: number | null;
  soldAt: Date;
  recordedAt?: Date;
};

export type InvestmentHistoryPoint = {
  price: number;
  quantity: number;
  fetchedAt: string;
};

function getMarketPriceHistoryD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as MarketPriceHistoryCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function mapD1Row(row: MarketPriceHistoryD1Row): MarketPriceHistoryEntry {
  return {
    id: row.id,
    itemHashedId: row.item_hashed_id,
    tier: row.tier,
    price: row.price,
    quantity: row.quantity,
    soldAt: new Date(row.sold_at),
    recordedAt: new Date(row.recorded_at),
  };
}

export async function getLatestMarketPrice(input: {
  itemHashedId: string;
  tier: number;
}): Promise<MarketPriceHistoryEntry | null> {
  const d1 = getMarketPriceHistoryD1();
  if (d1) {
    const row = await d1
      .prepare(
        `SELECT id, item_hashed_id, tier, price, quantity, sold_at, recorded_at
         FROM market_price_history
         WHERE item_hashed_id = ? AND tier = ?
         ORDER BY sold_at DESC
         LIMIT 1`
      )
      .bind(input.itemHashedId, input.tier)
      .first<MarketPriceHistoryD1Row>();

    return row ? mapD1Row(row) : null;
  }

  const [row] = await db
    .select()
    .from(marketPriceHistory)
    .where(and(eq(marketPriceHistory.itemHashedId, input.itemHashedId), eq(marketPriceHistory.tier, input.tier)))
    .orderBy(desc(marketPriceHistory.soldAt))
    .limit(1);

  return row ?? null;
}

export async function listMarketPriceHistory(input: {
  itemHashedId: string;
  tier: number;
  limit?: number;
}): Promise<InvestmentHistoryPoint[]> {
  const limit = input.limit ?? 90;
  const d1 = getMarketPriceHistoryD1();
  if (d1) {
    const rows = await d1
      .prepare(
        `SELECT id, item_hashed_id, tier, price, quantity, sold_at, recorded_at
         FROM market_price_history
         WHERE item_hashed_id = ? AND tier = ?
         ORDER BY sold_at DESC
         LIMIT ?`
      )
      .bind(input.itemHashedId, input.tier, limit)
      .all<MarketPriceHistoryD1Row>();

    return rows.results.map((row) => ({
      price: row.price,
      quantity: row.quantity,
      fetchedAt: row.sold_at,
    }));
  }

  const rows = await db
    .select({
      price: marketPriceHistory.price,
      quantity: marketPriceHistory.quantity,
      soldAt: marketPriceHistory.soldAt,
    })
    .from(marketPriceHistory)
    .where(and(eq(marketPriceHistory.itemHashedId, input.itemHashedId), eq(marketPriceHistory.tier, input.tier)))
    .orderBy(desc(marketPriceHistory.soldAt))
    .limit(limit);

  return rows.map((row) => ({
    price: row.price,
    quantity: row.quantity,
    fetchedAt: row.soldAt.toISOString(),
  }));
}

export async function insertMarketPriceHistory(input: MarketPriceHistoryInput): Promise<void> {
  const entry = {
    id: randomUUID(),
    itemHashedId: input.itemHashedId,
    tier: input.tier,
    price: input.price,
    quantity: input.quantity ?? 1,
    soldAt: input.soldAt,
    recordedAt: input.recordedAt ?? new Date(),
  };

  const d1 = getMarketPriceHistoryD1();
  if (d1) {
    await d1
      .prepare(
        `INSERT OR IGNORE INTO market_price_history (
           id, item_hashed_id, tier, price, quantity, sold_at, recorded_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.id,
        entry.itemHashedId,
        entry.tier,
        entry.price,
        entry.quantity,
        entry.soldAt.toISOString(),
        entry.recordedAt.toISOString()
      )
      .run();
    return;
  }

  await db.insert(marketPriceHistory).values(entry).onConflictDoNothing();
}
