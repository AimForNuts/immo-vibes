import { randomUUID } from "crypto";
import { getD1 } from "@/lib/db/d1";

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
  const row = await getD1()
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

export async function listMarketPriceHistory(input: {
  itemHashedId: string;
  tier: number;
  limit?: number;
}): Promise<InvestmentHistoryPoint[]> {
  const limit = input.limit ?? 90;
  const rows = await getD1()
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

  await getD1()
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
}
