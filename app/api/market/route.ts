import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { ilike, inArray, and, sql } from "drizzle-orm";
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
 * Params:
 *   query  – name substring search (case-insensitive)
 *   tab    – market tab id (e.g. "gear") — filters to that tab's types
 *   page   – 1-based page number (default 1, page size 50)
 *
 * Response: { items: MarketDbItem[], pagination: { current_page, last_page, total } }
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query  = searchParams.get("query")?.trim() ?? "";
  const tabId  = searchParams.get("tab") ?? "";
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  // Build type filter from tab
  const tab       = MARKET_TABS.find((t) => t.id === tabId);
  const typeList  = tab && tab.types.length > 0 ? tab.types : null;

  const conditions = [ilike(items.name, `%${query}%`)];
  if (typeList) conditions.push(inArray(items.type, typeList));
  const where = and(...conditions);

  // Count total for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(items)
    .where(where);

  const rows = await db
    .select()
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
    })),
    pagination: { current_page: page, last_page: lastPage, total: count },
  });
}
