import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, marketPriceHistory } from "@/lib/db/schema";

const IDLEMMO_BASE = "https://api.idle-mmo.com";

/**
 * GET /api/market/price/[id]?tier=N
 *
 * Returns the latest market price for an item at a given tier (1-based, default 1).
 *
 * Lookup order:
 *   1. market_price_history — latest record for (item, tier). Populated by sync jobs.
 *   2. items.last_sold_price — tier-1 fallback for items not yet in history.
 *   3. Live IdleMMO API fetch (tier > 1 cache miss only) — stores result in DB.
 *      Requires the session user to have an IdleMMO token configured.
 *
 * Response: { price: number | null, sold_at: string | null, quantity: number | null }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tierParam = request.nextUrl.searchParams.get("tier");
  const tier = tierParam ? Math.max(1, parseInt(tierParam, 10)) : 1;

  // 1. Check market_price_history for the latest price at this tier
  const historyRows = await db
    .select({
      price:     marketPriceHistory.price,
      soldAt:    marketPriceHistory.soldAt,
      quantity:  marketPriceHistory.quantity,
    })
    .from(marketPriceHistory)
    .where(
      and(
        eq(marketPriceHistory.itemHashedId, id),
        eq(marketPriceHistory.tier, tier)
      )
    )
    .orderBy(desc(marketPriceHistory.soldAt))
    .limit(1);

  if (historyRows.length > 0) {
    const row = historyRows[0];
    return NextResponse.json({
      price:    row.price,
      sold_at:  row.soldAt.toISOString(),
      quantity: row.quantity,
    });
  }

  // 2. Tier-1 fallback: read from items.last_sold_price (populated by sync-prices)
  if (tier === 1) {
    const itemRows = await db
      .select({ lastSoldPrice: items.lastSoldPrice, lastSoldAt: items.lastSoldAt })
      .from(items)
      .where(eq(items.hashedId, id))
      .limit(1);

    if (itemRows.length === 0) {
      return NextResponse.json({ price: null, sold_at: null, quantity: null });
    }

    return NextResponse.json({
      price:    itemRows[0].lastSoldPrice ?? null,
      sold_at:  itemRows[0].lastSoldAt?.toISOString() ?? null,
      quantity: null,
    });
  }

  // 3. Tier > 1 cache miss: fetch live from IdleMMO API and persist for future requests
  const token = session.user.idlemmoToken;
  if (!token) {
    return NextResponse.json({ price: null, sold_at: null, quantity: null });
  }

  try {
    // IdleMMO API uses 0-based tier values (tier=0 → tier 1, tier=1 → tier 2, etc.)
    const res = await fetch(
      `${IDLEMMO_BASE}/v1/item/${id}/market-history?tier=${tier - 1}&type=listings`,
      {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ price: null, sold_at: null, quantity: null });
    }

    const data   = await res.json();
    // The API returns all recent sales across ALL tiers in latest_sold — filter to the
    // requested tier. The response uses 0-based tiers (tier=0 = game tier 1).
    const latest = Array.isArray(data.latest_sold)
      ? (data.latest_sold.find((s: { tier: number }) => s.tier === tier - 1) ?? null)
      : null;

    if (!latest?.price_per_item) {
      return NextResponse.json({ price: null, sold_at: null, quantity: null });
    }

    const price    = latest.price_per_item as number;
    const soldAt   = new Date(latest.sold_at);
    const quantity = latest.quantity ?? 1;

    // Persist so subsequent requests are served from the DB
    try {
      await db.insert(marketPriceHistory).values({
        id:           randomUUID(),
        itemHashedId: id,
        tier,
        price,
        quantity,
        soldAt,
        recordedAt:   new Date(),
      }).onConflictDoNothing();
    } catch { /* non-blocking */ }

    return NextResponse.json({ price, sold_at: soldAt.toISOString(), quantity });
  } catch {
    return NextResponse.json({ price: null, sold_at: null, quantity: null });
  }
}
