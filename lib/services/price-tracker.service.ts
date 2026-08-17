import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db } from "@/lib/db";
import { priceTracker } from "@/lib/db/schema";

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

type PriceTrackerCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type PriceTrackerD1Row = {
  id: string;
  user_id: string;
  item_hashed_id: string;
  item_name: string;
  item_quality: string;
  item_type: string;
  image_url: string | null;
  tier: number;
  created_at: string;
};

export type TrackedPriceItem = {
  id: string;
  userId: string;
  itemHashedId: string;
  itemName: string;
  itemQuality: string;
  itemType: string;
  imageUrl: string | null;
  tier: number;
  createdAt: Date;
};

function getPriceTrackerD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as PriceTrackerCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function mapD1Row(row: PriceTrackerD1Row): TrackedPriceItem {
  return {
    id: row.id,
    userId: row.user_id,
    itemHashedId: row.item_hashed_id,
    itemName: row.item_name,
    itemQuality: row.item_quality,
    itemType: row.item_type,
    imageUrl: row.image_url,
    tier: row.tier,
    createdAt: new Date(row.created_at),
  };
}

export async function getTrackedPriceItems(userId: string): Promise<TrackedPriceItem[]> {
  const d1 = getPriceTrackerD1();
  if (d1) {
    const rows = await d1
      .prepare(
        `SELECT id, user_id, item_hashed_id, item_name, item_quality, item_type, image_url, tier, created_at
         FROM price_tracker
         WHERE user_id = ?
         ORDER BY created_at ASC`
      )
      .bind(userId)
      .all<PriceTrackerD1Row>();

    return rows.results.map(mapD1Row);
  }

  return db
    .select()
    .from(priceTracker)
    .where(eq(priceTracker.userId, userId))
    .orderBy(priceTracker.createdAt);
}

export async function getTrackedPriceItem(input: {
  id: string;
  userId: string;
}): Promise<TrackedPriceItem | null> {
  const d1 = getPriceTrackerD1();
  if (d1) {
    const row = await d1
      .prepare(
        `SELECT id, user_id, item_hashed_id, item_name, item_quality, item_type, image_url, tier, created_at
         FROM price_tracker
         WHERE id = ? AND user_id = ?`
      )
      .bind(input.id, input.userId)
      .first<PriceTrackerD1Row>();

    return row ? mapD1Row(row) : null;
  }

  const [tracked] = await db
    .select()
    .from(priceTracker)
    .where(and(eq(priceTracker.id, input.id), eq(priceTracker.userId, input.userId)));

  return tracked ?? null;
}

export async function createTrackedPriceItem(input: {
  userId: string;
  itemHashedId: string;
  itemName: string;
  itemQuality: string;
  itemType: string;
  imageUrl?: string | null;
  tier?: number;
}): Promise<TrackedPriceItem> {
  const now = new Date();
  const item: TrackedPriceItem = {
    id: randomUUID(),
    userId: input.userId,
    itemHashedId: input.itemHashedId,
    itemName: input.itemName,
    itemQuality: input.itemQuality,
    itemType: input.itemType,
    imageUrl: input.imageUrl ?? null,
    tier: input.tier ?? 1,
    createdAt: now,
  };

  const d1 = getPriceTrackerD1();
  if (d1) {
    await d1
      .prepare(
        `INSERT INTO price_tracker (
           id, user_id, item_hashed_id, item_name, item_quality, item_type, image_url, tier, created_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        item.id,
        item.userId,
        item.itemHashedId,
        item.itemName,
        item.itemQuality,
        item.itemType,
        item.imageUrl,
        item.tier,
        item.createdAt.toISOString()
      )
      .run();

    return item;
  }

  const [created] = await db.insert(priceTracker).values(item).returning();
  return created;
}

export async function deleteTrackedPriceItem(input: {
  id: string;
  userId: string;
}) {
  const d1 = getPriceTrackerD1();
  if (d1) {
    await d1
      .prepare(
        `DELETE FROM price_tracker
         WHERE id = ? AND user_id = ?`
      )
      .bind(input.id, input.userId)
      .run();
    return;
  }

  await db
    .delete(priceTracker)
    .where(and(eq(priceTracker.id, input.id), eq(priceTracker.userId, input.userId)));
}
