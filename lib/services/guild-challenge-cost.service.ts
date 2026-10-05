import { getD1, type D1Value } from "@/lib/db/d1";
import type { GuildChallengeCostLine } from "@/lib/domain/guild-challenge-cost";

type ChallengeCostItemRow = {
  hashed_id: string;
  name: string;
  quality: string;
  image_url: string | null;
  last_sold_price: number | null;
  last_sold_at: string | null;
  history_price: number | null;
  history_sold_at: string | null;
};

export type GuildChallengeCostPricedLine = GuildChallengeCostLine & {
  matchedItem: {
    hashedId: string;
    name: string;
    quality: string;
    imageUrl: string | null;
  } | null;
  unitPrice: number | null;
  totalPrice: number | null;
  soldAt: string | null;
};

export type GuildChallengeCostResult = {
  items: GuildChallengeCostPricedLine[];
  total: number;
  missingCount: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function calculateGuildChallengeCost(
  lines: GuildChallengeCostLine[]
): Promise<GuildChallengeCostResult> {
  if (lines.length === 0) return { items: [], total: 0, missingCount: 0 };

  const names = Array.from(new Set(lines.map((line) => normalizeName(line.name))));
  const placeholders = names.map(() => "?").join(", ");
  const values: D1Value[] = names;

  const { results } = await getD1()
    .prepare(
      `SELECT
         i.hashed_id,
         i.name,
         i.quality,
         i.image_url,
         i.last_sold_price,
         i.last_sold_at,
         mph.price AS history_price,
         mph.sold_at AS history_sold_at
       FROM items i
       LEFT JOIN (
         SELECT item_hashed_id, price, sold_at
         FROM market_price_history
         WHERE tier = 1
           AND sold_at = (
             SELECT MAX(inner_mph.sold_at)
             FROM market_price_history inner_mph
             WHERE inner_mph.item_hashed_id = market_price_history.item_hashed_id
               AND inner_mph.tier = 1
           )
       ) mph ON mph.item_hashed_id = i.hashed_id
       WHERE lower(i.name) IN (${placeholders})`
    )
    .bind(...values)
    .all<ChallengeCostItemRow>();

  const itemsByName = new Map(results.map((row) => [normalizeName(row.name), row]));
  const items = lines.map((line) => {
    const row = itemsByName.get(normalizeName(line.name)) ?? null;
    const unitPrice = row?.history_price ?? row?.last_sold_price ?? null;
    const soldAt = row?.history_sold_at ?? row?.last_sold_at ?? null;
    const totalPrice = unitPrice === null ? null : unitPrice * line.quantity;

    return {
      ...line,
      matchedItem: row
        ? {
            hashedId: row.hashed_id,
            name: row.name,
            quality: row.quality,
            imageUrl: row.image_url,
          }
        : null,
      unitPrice,
      totalPrice,
      soldAt,
    };
  });

  return {
    items,
    total: items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0),
    missingCount: items.filter((item) => item.unitPrice === null).length,
  };
}
