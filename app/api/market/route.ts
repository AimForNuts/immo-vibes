import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ilike, inArray, and, not, or, eq, gte, asc, desc, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { MARKET_TABS } from "@/lib/market-config";

const PAGE_SIZE = 50;

/**
 * GET /api/market
 *
 * Queries the local items table — no IdleMMO API call, no rate-limit risk.
 * Items must have been synced via POST /api/admin/sync-items first.
 *
 * Modes:
 *   tab browse        — ?tab=gear&page=1              → all items for that tab's types
 *   name search       — ?query=iron&page=1            → name ILIKE, optional ?tab= filter
 *   recently added    — ?tab=recently_added&dateRange=latest|30d|1y
 *                        latest = all items on the most recent first_seen_at calendar day
 *                        30d    = items added in the last 30 days
 *                        1y     = items added in the last year
 *
 * Response: { items: MarketDbItem[], pagination: { current_page, last_page, total } }
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query     = searchParams.get("query")?.trim() ?? "";
  const tabId     = searchParams.get("tab") ?? "";
  const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const dateRange = searchParams.get("dateRange") ?? "latest";

  // ── Recently Added mode ───────────────────────────────────────────────────
  if (tabId === "recently_added") {
    let dateCondition;
    if (dateRange === "30d") {
      dateCondition = gte(items.firstSeenAt, sql`NOW() - INTERVAL '30 days'`);
    } else if (dateRange === "1y") {
      dateCondition = gte(items.firstSeenAt, sql`NOW() - INTERVAL '1 year'`);
    } else {
      // latest: same calendar day as the most recent first_seen_at in the DB
      dateCondition = sql`DATE_TRUNC('day', ${items.firstSeenAt}) = (SELECT DATE_TRUNC('day', MAX(first_seen_at)) FROM items)`;
    }

    const conditions = [dateCondition];
    if (query) conditions.push(ilike(items.name, `%${query}%`));
    const where = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(items)
      .where(where);

    const rows = await db
      .select()
      .from(items)
      .where(where)
      .orderBy(desc(items.firstSeenAt), asc(items.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));

    return NextResponse.json({
      items: rows.map((r) => ({
        hashed_id:       r.hashedId,
        name:            r.name,
        type:            r.type,
        quality:         r.quality,
        image_url:       r.imageUrl,
        vendor_price:    r.vendorPrice   ?? null,
        last_sold_price: r.lastSoldPrice ?? null,
        last_sold_at:    r.lastSoldAt    ? r.lastSoldAt.toISOString() : null,
        is_tradeable:    r.isTradeable   ?? null,
        recipe_skill:    null,
        store_price:     r.storePrice    ?? null,
      })),
      pagination: { current_page: page, last_page: lastPage, total: count },
    });
  }

  // ── Standard tab / search mode ────────────────────────────────────────────
  const tab        = MARKET_TABS.find((t) => t.id === tabId);
  const typeList   = tab && tab.types.length > 0 ? tab.types : null;
  const recipeSkill = searchParams.get("recipeSkill")?.trim() ?? "";

  // Must have a name query OR be on a category tab (not "all" or "recently_added")
  if (!query && !typeList) {
    return NextResponse.json({ error: "query or a category tab is required" }, { status: 400 });
  }

  const conditions = [];
  if (query) conditions.push(ilike(items.name, `%${query}%`));

  if (tabId === "legacy") {
    // Legacy: GEMSTONE OR year-named CAMPAIGN_ITEMs
    conditions.push(
      or(
        eq(items.type, "GEMSTONE"),
        and(eq(items.type, "CAMPAIGN_ITEM"), sql`${items.name} ~ '\\d{4}'`),
      )!,
    );
  } else if (typeList) {
    conditions.push(inArray(items.type, typeList));
    if (tabId === "resources") {
      // Exclude year-named CAMPAIGN_ITEMs from resources
      conditions.push(
        not(and(eq(items.type, "CAMPAIGN_ITEM"), sql`${items.name} ~ '\\d{4}'`)!),
      );
    }
    if (tabId === "recipes" && recipeSkill) {
      // Filter by recipe skill sub-tab
      conditions.push(sql`${items.recipe}->>'skill' = ${recipeSkill}`);
    }
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(where);

  const rows = await db
    .select({
      hashedId:      items.hashedId,
      name:          items.name,
      type:          items.type,
      quality:       items.quality,
      imageUrl:      items.imageUrl,
      vendorPrice:   items.vendorPrice,
      lastSoldPrice: items.lastSoldPrice,
      lastSoldAt:    items.lastSoldAt,
      isTradeable:   items.isTradeable,
      recipe_skill:  sql<string | null>`${items.recipe}->>'skill'`.as("recipe_skill"),
      store_price:   items.storePrice,
    })
    .from(items)
    .where(where)
    .orderBy(items.name)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return NextResponse.json({
    items: rows.map((r) => ({
      hashed_id:       r.hashedId,
      name:            r.name,
      type:            r.type,
      quality:         r.quality,
      image_url:       r.imageUrl,
      vendor_price:    r.vendorPrice   ?? null,
      last_sold_price: r.lastSoldPrice ?? null,
      last_sold_at:    r.lastSoldAt    ? r.lastSoldAt.toISOString() : null,
      is_tradeable:    r.isTradeable   ?? null,
      recipe_skill:    r.recipe_skill  ?? null,
      store_price:     r.store_price   ?? null,
    })),
    pagination: { current_page: page, last_page: lastPage, total: count },
  });
}
