import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, not, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, type ItemEffect, type ItemRecipe } from "@/lib/db/schema";
import { MARKET_TABS } from "@/lib/market-config";

type D1Value = string | number | boolean | null;

type D1PreparedStatement = {
  bind(...values: D1Value[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
};

type D1DatabaseBinding = {
  prepare(query: string): D1PreparedStatement;
};

type ItemsCloudflareEnv = {
  IMMO_SYNC_DB?: D1DatabaseBinding;
};

type ItemD1Row = {
  hashed_id: string;
  name: string;
  type: string;
  quality: string;
  image_url: string | null;
  synced_at: string;
  first_seen_at: string;
  vendor_price: number | null;
  store_price: number | null;
  description: string | null;
  is_tradeable: number | null;
  max_tier: number | null;
  requirements: string | null;
  base_stats: string | null;
  tier_modifiers: string | null;
  effects: string | null;
  recipe: string | null;
  inspected_at: string | null;
  recipe_result_hashed_id: string | null;
  last_sold_price: number | null;
  last_sold_at: string | null;
  price_checked_at: string | null;
};

export type StoredItem = {
  hashedId: string;
  name: string;
  type: string;
  quality: string;
  imageUrl: string | null;
  syncedAt: Date;
  firstSeenAt: Date;
  vendorPrice: number | null;
  storePrice: number | null;
  description: string | null;
  isTradeable: boolean | null;
  maxTier: number | null;
  requirements: Record<string, number> | null;
  baseStats: Record<string, number> | null;
  tierModifiers: Record<string, number> | null;
  effects: ItemEffect[] | null;
  recipe: ItemRecipe | null;
  inspectedAt: Date | null;
  recipeResultHashedId: string | null;
  lastSoldPrice: number | null;
  lastSoldAt: Date | null;
  priceCheckedAt: Date | null;
};

export type CatalogItemInput = {
  hashedId: string;
  name: string;
  type: string;
  quality: string;
  imageUrl: string | null;
  vendorPrice: number | null;
  syncedAt: Date;
};

export type InspectItemInput = {
  description: string | null;
  isTradeable: boolean | null;
  maxTier: number | null;
  requirements: Record<string, number> | null;
  baseStats: Record<string, number> | null;
  tierModifiers: Record<string, number> | null;
  effects: ItemEffect[] | null;
  recipe: ItemRecipe | null;
  inspectedAt: Date;
};

export type MarketItemRow = {
  hashedId: string;
  name: string;
  type: string;
  quality: string;
  imageUrl: string | null;
  vendorPrice: number | null;
  lastSoldPrice: number | null;
  lastSoldAt: Date | null;
  isTradeable: boolean | null;
  recipeSkill: string | null;
  storePrice: number | null;
};

export type BasicItemRow = {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
};

export type AdminItemRow = {
  hashedId: string;
  name: string;
  type: string;
  quality: string | null;
  syncedAt: Date | null;
};

const SELECT_ALL = `hashed_id, name, type, quality, image_url, synced_at, first_seen_at,
  vendor_price, store_price, description, is_tradeable, max_tier, requirements,
  base_stats, tier_modifiers, effects, recipe, inspected_at, recipe_result_hashed_id,
  last_sold_price, last_sold_at, price_checked_at`;

function getItemsD1(): D1DatabaseBinding | null {
  try {
    return (getCloudflareContext().env as ItemsCloudflareEnv).IMMO_SYNC_DB ?? null;
  } catch {
    return null;
  }
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function toJson(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function mapD1Item(row: ItemD1Row): StoredItem {
  return {
    hashedId: row.hashed_id,
    name: row.name,
    type: row.type,
    quality: row.quality,
    imageUrl: row.image_url,
    syncedAt: new Date(row.synced_at),
    firstSeenAt: new Date(row.first_seen_at),
    vendorPrice: row.vendor_price,
    storePrice: row.store_price,
    description: row.description,
    isTradeable: row.is_tradeable === null ? null : row.is_tradeable === 1,
    maxTier: row.max_tier,
    requirements: parseJson<Record<string, number>>(row.requirements),
    baseStats: parseJson<Record<string, number>>(row.base_stats),
    tierModifiers: parseJson<Record<string, number>>(row.tier_modifiers),
    effects: parseJson<ItemEffect[]>(row.effects),
    recipe: parseJson<ItemRecipe>(row.recipe),
    inspectedAt: toDate(row.inspected_at),
    recipeResultHashedId: row.recipe_result_hashed_id,
    lastSoldPrice: row.last_sold_price,
    lastSoldAt: toDate(row.last_sold_at),
    priceCheckedAt: toDate(row.price_checked_at),
  };
}

function mapMarketItem(row: StoredItem): MarketItemRow {
  return {
    hashedId: row.hashedId,
    name: row.name,
    type: row.type,
    quality: row.quality,
    imageUrl: row.imageUrl,
    vendorPrice: row.vendorPrice,
    lastSoldPrice: row.lastSoldPrice,
    lastSoldAt: row.lastSoldAt,
    isTradeable: row.isTradeable,
    recipeSkill: row.recipe?.skill ?? null,
    storePrice: row.storePrice,
  };
}

function d1Where(conditions: string[]) {
  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export async function getAdminItems(params: {
  page: number;
  pageSize: number;
  name?: string;
  type?: string;
  quality?: string;
}): Promise<{ data: AdminItemRow[]; total: number; page: number; pageSize: number }> {
  const { page, pageSize, name, type, quality } = params;
  const offset = (page - 1) * pageSize;
  const d1 = getItemsD1();

  if (d1) {
    const conditions: string[] = [];
    const values: D1Value[] = [];
    if (name) {
      conditions.push("lower(name) LIKE ?");
      values.push(`%${name.toLowerCase()}%`);
    }
    if (type) {
      conditions.push("type = ?");
      values.push(type);
    }
    if (quality) {
      conditions.push("quality = ?");
      values.push(quality);
    }
    const where = d1Where(conditions);
    const rows = await d1
      .prepare(`SELECT hashed_id, name, type, quality, synced_at FROM items ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
      .bind(...values, pageSize, offset)
      .all<{ hashed_id: string; name: string; type: string; quality: string; synced_at: string }>();
    const total = await d1.prepare(`SELECT COUNT(*) AS value FROM items ${where}`).bind(...values).all<{ value: number }>();
    return {
      data: rows.results.map((row) => ({
        hashedId: row.hashed_id,
        name: row.name,
        type: row.type,
        quality: row.quality,
        syncedAt: new Date(row.synced_at),
      })),
      total: total.results[0]?.value ?? 0,
      page,
      pageSize,
    };
  }

  const conditions: SQL[] = [];
  if (name) conditions.push(ilike(items.name, `%${name}%`));
  if (type) conditions.push(eq(items.type, type));
  if (quality) conditions.push(eq(items.quality, quality));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [data, totals] = await Promise.all([
    db.select({
      hashedId: items.hashedId,
      name: items.name,
      type: items.type,
      quality: items.quality,
      syncedAt: items.syncedAt,
    }).from(items).where(where).orderBy(items.name).limit(pageSize).offset(offset),
    db.select({ value: count() }).from(items).where(where),
  ]);
  return { data, total: Number(totals[0].value), page, pageSize };
}

export async function getMarketItems(params: {
  query: string;
  tabId: string;
  page: number;
  pageSize: number;
  dateRange: string;
  recipeSkill: string;
}): Promise<{ data: MarketItemRow[]; total: number }> {
  const { query, tabId, page, pageSize, dateRange, recipeSkill } = params;
  const offset = (page - 1) * pageSize;
  const d1 = getItemsD1();

  if (d1) {
    const conditions: string[] = [];
    const values: D1Value[] = [];
    let order = "name ASC";

    if (tabId === "recently_added") {
      if (dateRange === "30d") {
        conditions.push("first_seen_at >= ?");
        values.push(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      } else if (dateRange === "1y") {
        conditions.push("first_seen_at >= ?");
        values.push(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
      } else {
        const latest = await d1
          .prepare("SELECT substr(MAX(first_seen_at), 1, 10) AS value FROM items")
          .all<{ value: string | null }>();
        conditions.push("substr(first_seen_at, 1, 10) = ?");
        values.push(latest.results[0]?.value ?? "");
      }
      order = "first_seen_at DESC, name ASC";
    } else {
      const tab = MARKET_TABS.find((t) => t.id === tabId);
      const typeList = tab && tab.types.length > 0 ? tab.types : null;
      if (!query && !typeList) return { data: [], total: 0 };
      if (tabId === "legacy") {
        conditions.push("(type = 'GEMSTONE' OR (type = 'CAMPAIGN_ITEM' AND name GLOB '*[0-9][0-9][0-9][0-9]*'))");
      } else if (typeList) {
        conditions.push(`type IN (${typeList.map(() => "?").join(", ")})`);
        values.push(...typeList);
        if (tabId === "resources") {
          conditions.push("NOT (type = 'CAMPAIGN_ITEM' AND name GLOB '*[0-9][0-9][0-9][0-9]*')");
        }
        if (tabId === "recipes" && recipeSkill) {
          conditions.push("json_extract(recipe, '$.skill') = ?");
          values.push(recipeSkill);
        }
      }
    }

    if (query) {
      conditions.push("lower(name) LIKE ?");
      values.push(`%${query.toLowerCase()}%`);
    }

    const where = d1Where(conditions);
    const rows = await d1.prepare(`SELECT ${SELECT_ALL} FROM items ${where} ORDER BY ${order} LIMIT ? OFFSET ?`)
      .bind(...values, pageSize, offset)
      .all<ItemD1Row>();
    const total = await d1.prepare(`SELECT COUNT(*) AS value FROM items ${where}`).bind(...values).all<{ value: number }>();
    return { data: rows.results.map(mapD1Item).map(mapMarketItem), total: total.results[0]?.value ?? 0 };
  }

  if (tabId === "recently_added") {
    let dateCondition;
    if (dateRange === "30d") {
      dateCondition = gte(items.firstSeenAt, sql`NOW() - INTERVAL '30 days'`);
    } else if (dateRange === "1y") {
      dateCondition = gte(items.firstSeenAt, sql`NOW() - INTERVAL '1 year'`);
    } else {
      dateCondition = sql`DATE_TRUNC('day', ${items.firstSeenAt}) = (SELECT DATE_TRUNC('day', MAX(first_seen_at)) FROM items)`;
    }
    const conditions = [dateCondition];
    if (query) conditions.push(ilike(items.name, `%${query}%`));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];
    const [{ value: total }] = await db.select({ value: count() }).from(items).where(where);
    const rows = await db.select().from(items).where(where).orderBy(desc(items.firstSeenAt), asc(items.name)).limit(pageSize).offset(offset);
    return { data: rows.map(mapMarketItem), total: Number(total) };
  }

  const tab = MARKET_TABS.find((t) => t.id === tabId);
  const typeList = tab && tab.types.length > 0 ? tab.types : null;
  if (!query && !typeList) return { data: [], total: 0 };
  const conditions: SQL[] = [];
  if (query) conditions.push(ilike(items.name, `%${query}%`));
  if (tabId === "legacy") {
    conditions.push(or(eq(items.type, "GEMSTONE"), and(eq(items.type, "CAMPAIGN_ITEM"), sql`${items.name} ~ '\\d{4}'`))!);
  } else if (typeList) {
    conditions.push(inArray(items.type, typeList));
    if (tabId === "resources") conditions.push(not(and(eq(items.type, "CAMPAIGN_ITEM"), sql`${items.name} ~ '\\d{4}'`)!));
    if (tabId === "recipes" && recipeSkill) conditions.push(sql`${items.recipe}->>'skill' = ${recipeSkill}`);
  }
  const where = conditions.length > 1 ? and(...conditions) : conditions[0];
  const [{ value: total }] = await db.select({ value: count() }).from(items).where(where);
  const rows = await db.select().from(items).where(where).orderBy(items.name).limit(pageSize).offset(offset);
  return { data: rows.map(mapMarketItem), total: Number(total) };
}

export async function searchCatalogItems(params: {
  type: string;
  q?: string;
  quality?: string;
  limit: number;
}): Promise<StoredItem[]> {
  const d1 = getItemsD1();
  if (d1) {
    const conditions = ["type = ?"];
    const values: D1Value[] = [params.type];
    if (params.q) {
      conditions.push("lower(name) LIKE ?");
      values.push(`%${params.q.toLowerCase()}%`);
    }
    if (params.quality) {
      conditions.push("quality = ?");
      values.push(params.quality);
    }
    const { results } = await d1
      .prepare(`SELECT ${SELECT_ALL} FROM items WHERE ${conditions.join(" AND ")} ORDER BY name ASC LIMIT ?`)
      .bind(...values, params.limit)
      .all<ItemD1Row>();
    return results.map(mapD1Item);
  }

  const filters = [
    eq(items.type, params.type),
    ...(params.q ? [ilike(items.name, `%${params.q}%`)] : []),
    ...(params.quality ? [eq(items.quality, params.quality)] : []),
  ];
  return db.select().from(items).where(and(...filters)).orderBy(items.name).limit(params.limit);
}

export async function getItemById(id: string): Promise<StoredItem | null> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1.prepare(`SELECT ${SELECT_ALL} FROM items WHERE hashed_id = ? LIMIT 1`).bind(id).all<ItemD1Row>();
    return results[0] ? mapD1Item(results[0]) : null;
  }
  const [row] = await db.select().from(items).where(eq(items.hashedId, id)).limit(1);
  return row ?? null;
}

export async function getItemsByIds(ids: string[]): Promise<BasicItemRow[]> {
  if (ids.length === 0) return [];
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare(`SELECT hashed_id, name, quality, image_url FROM items WHERE hashed_id IN (${ids.map(() => "?").join(", ")})`)
      .bind(...ids)
      .all<{ hashed_id: string; name: string; quality: string; image_url: string | null }>();
    return results.map((row) => ({ hashedId: row.hashed_id, name: row.name, quality: row.quality, imageUrl: row.image_url }));
  }
  return db.select({ hashedId: items.hashedId, name: items.name, quality: items.quality, imageUrl: items.imageUrl })
    .from(items)
    .where(inArray(items.hashedId, ids));
}

export async function getForgeRecipeItems(): Promise<Array<BasicItemRow & { recipe: ItemRecipe }>> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare(`SELECT hashed_id, name, quality, image_url, recipe FROM items WHERE json_extract(recipe, '$.skill') = 'Forge' ORDER BY name ASC`)
      .all<{ hashed_id: string; name: string; quality: string; image_url: string | null; recipe: string | null }>();
    return results
      .map((row) => ({ hashedId: row.hashed_id, name: row.name, quality: row.quality, imageUrl: row.image_url, recipe: parseJson<ItemRecipe>(row.recipe) }))
      .filter((row): row is BasicItemRow & { recipe: ItemRecipe } => Boolean(row.recipe?.materials?.length));
  }
  const rows = await db.select({
    hashedId: items.hashedId,
    name: items.name,
    quality: items.quality,
    imageUrl: items.imageUrl,
    recipe: items.recipe,
  }).from(items).where(eq(sql<string>`${items.recipe}->>'skill'`, "Forge")).orderBy(asc(items.name));
  return rows.filter((row): row is BasicItemRow & { recipe: ItemRecipe } => Boolean(row.recipe?.materials?.length));
}

export async function findRecipeForResult(resultHashedId: string): Promise<{ hashedId: string; name: string } | null> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT hashed_id, name FROM items WHERE recipe_result_hashed_id = ? LIMIT 1")
      .bind(resultHashedId)
      .all<{ hashed_id: string; name: string }>();
    return results[0] ? { hashedId: results[0].hashed_id, name: results[0].name } : null;
  }
  const [row] = await db.select({ hashedId: items.hashedId, name: items.name }).from(items).where(eq(items.recipeResultHashedId, resultHashedId)).limit(1);
  return row ?? null;
}

export async function itemExists(id: string): Promise<boolean> {
  return (await getItemById(id)) !== null;
}

export async function updateStorePrice(id: string, storePrice: number | null): Promise<number | null | undefined> {
  const d1 = getItemsD1();
  if (d1) {
    const existing = await itemExists(id);
    if (!existing) return undefined;
    await d1.prepare("UPDATE items SET store_price = ? WHERE hashed_id = ?").bind(storePrice, id).run();
    return storePrice;
  }
  const updated = await db.update(items).set({ storePrice }).where(eq(items.hashedId, id)).returning({ storePrice: items.storePrice });
  return updated[0]?.storePrice;
}

export async function upsertCatalogItems(rows: CatalogItemInput[]): Promise<void> {
  if (rows.length === 0) return;
  const d1 = getItemsD1();
  if (d1) {
    for (const row of rows) {
      await d1.prepare(
        `INSERT INTO items (hashed_id, name, type, quality, image_url, synced_at, first_seen_at, vendor_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(hashed_id) DO UPDATE SET
           name = excluded.name,
           type = excluded.type,
           quality = excluded.quality,
           image_url = excluded.image_url,
           vendor_price = excluded.vendor_price,
           synced_at = excluded.synced_at`
      ).bind(row.hashedId, row.name, row.type, row.quality, row.imageUrl, row.syncedAt.toISOString(), row.syncedAt.toISOString(), row.vendorPrice).run();
    }
    return;
  }
  await db.insert(items).values(rows).onConflictDoUpdate({
    target: items.hashedId,
    set: {
      name: sql`excluded.name`,
      type: sql`excluded.type`,
      quality: sql`excluded.quality`,
      imageUrl: sql`excluded.image_url`,
      vendorPrice: sql`excluded.vendor_price`,
      syncedAt: sql`excluded.synced_at`,
    },
  });
}

export async function countItemsByType(type: string): Promise<number> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1.prepare("SELECT COUNT(*) AS value FROM items WHERE type = ?").bind(type).all<{ value: number }>();
    return results[0]?.value ?? 0;
  }
  const [{ value }] = await db.select({ value: count() }).from(items).where(eq(items.type, type));
  return Number(value);
}

export async function getItemIdsByType(type: string, page: number, pageSize: number): Promise<Array<{ hashedId: string; recipeResultHashedId: string | null }>> {
  const offset = (page - 1) * pageSize;
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT hashed_id, recipe_result_hashed_id FROM items WHERE type = ? ORDER BY hashed_id ASC LIMIT ? OFFSET ?")
      .bind(type, pageSize, offset)
      .all<{ hashed_id: string; recipe_result_hashed_id: string | null }>();
    return results.map((row) => ({ hashedId: row.hashed_id, recipeResultHashedId: row.recipe_result_hashed_id }));
  }
  return db.select({ hashedId: items.hashedId, recipeResultHashedId: items.recipeResultHashedId })
    .from(items)
    .where(eq(items.type, type))
    .orderBy(items.hashedId)
    .limit(pageSize)
    .offset(offset);
}

export async function countMissingRecipeResults(): Promise<number> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1.prepare("SELECT COUNT(*) AS value FROM items WHERE type = 'RECIPE' AND recipe_result_hashed_id IS NULL").all<{ value: number }>();
    return results[0]?.value ?? 0;
  }
  const [{ value }] = await db.select({ value: count() }).from(items).where(and(eq(items.type, "RECIPE"), isNull(items.recipeResultHashedId)));
  return Number(value);
}

export async function getMissingRecipeResultItemIds(page: number, pageSize: number): Promise<Array<{ hashedId: string }>> {
  const offset = (page - 1) * pageSize;
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT hashed_id FROM items WHERE type = 'RECIPE' AND recipe_result_hashed_id IS NULL ORDER BY hashed_id ASC LIMIT ? OFFSET ?")
      .bind(pageSize, offset)
      .all<{ hashed_id: string }>();
    return results.map((row) => ({ hashedId: row.hashed_id }));
  }
  return db.select({ hashedId: items.hashedId })
    .from(items)
    .where(and(eq(items.type, "RECIPE"), isNull(items.recipeResultHashedId)))
    .orderBy(items.hashedId)
    .limit(pageSize)
    .offset(offset);
}

export async function updateItemInspectFields(hashedId: string, data: InspectItemInput): Promise<void> {
  const d1 = getItemsD1();
  if (d1) {
    await d1.prepare(
      `UPDATE items
       SET description = ?, is_tradeable = ?, max_tier = ?, requirements = ?, base_stats = ?,
           tier_modifiers = ?, effects = ?, recipe = ?, inspected_at = ?
       WHERE hashed_id = ?`
    ).bind(
      data.description,
      data.isTradeable === null ? null : data.isTradeable ? 1 : 0,
      data.maxTier,
      toJson(data.requirements),
      toJson(data.baseStats),
      toJson(data.tierModifiers),
      toJson(data.effects),
      toJson(data.recipe),
      data.inspectedAt.toISOString(),
      hashedId
    ).run();
    return;
  }
  await db.update(items).set(data).where(eq(items.hashedId, hashedId));
}

export async function updateRecipeResult(hashedId: string, recipeResultHashedId: string): Promise<void> {
  const d1 = getItemsD1();
  if (d1) {
    await d1.prepare("UPDATE items SET recipe_result_hashed_id = ? WHERE hashed_id = ?").bind(recipeResultHashedId, hashedId).run();
    return;
  }
  await db.update(items).set({ recipeResultHashedId }).where(eq(items.hashedId, hashedId));
}

export async function getItemsForPriceSync(limit: number): Promise<Array<{ hashedId: string }>> {
  const d1 = getItemsD1();
  if (d1) {
    const { results } = await d1
      .prepare("SELECT hashed_id FROM items ORDER BY price_checked_at IS NOT NULL ASC, price_checked_at ASC LIMIT ?")
      .bind(limit)
      .all<{ hashed_id: string }>();
    return results.map((row) => ({ hashedId: row.hashed_id }));
  }
  return db.select({ hashedId: items.hashedId }).from(items).orderBy(asc(items.priceCheckedAt)).limit(limit);
}

export async function updateItemPriceFields(input: {
  hashedId: string;
  lastSoldPrice?: number | null;
  lastSoldAt?: Date | null;
  priceCheckedAt: Date;
}): Promise<void> {
  const d1 = getItemsD1();
  if (d1) {
    await d1.prepare(
      `UPDATE items
       SET last_sold_price = COALESCE(?, last_sold_price),
           last_sold_at = COALESCE(?, last_sold_at),
           price_checked_at = ?
       WHERE hashed_id = ?`
    ).bind(
      input.lastSoldPrice ?? null,
      input.lastSoldAt?.toISOString() ?? null,
      input.priceCheckedAt.toISOString(),
      input.hashedId
    ).run();
    return;
  }
  await db.update(items).set({
    ...(input.lastSoldPrice !== undefined && { lastSoldPrice: input.lastSoldPrice }),
    ...(input.lastSoldAt !== undefined && { lastSoldAt: input.lastSoldAt }),
    priceCheckedAt: input.priceCheckedAt,
  }).where(eq(items.hashedId, input.hashedId));
}
