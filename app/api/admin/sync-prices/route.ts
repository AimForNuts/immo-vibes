import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, marketPriceHistory } from "@/lib/db/schema";
import { IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

const BASE = "https://api.idle-mmo.com";
const ALL_TYPES = IDLEMMO_ITEM_TYPES as readonly string[];

/**
 * POST /api/admin/sync-prices?type=SWORD
 *
 * Fetches the latest market-history entry for every item of the given type
 * from the IdleMMO API and updates items.last_sold_price / last_sold_at.
 * Also inserts records into market_price_history for historical tracking.
 *
 * Rate-limit aware: reads X-RateLimit-Remaining from each response and waits
 * until the reset window when exhausted.
 *
 * Response: { synced: number, skipped: number, total: number }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();

  if (!type || !ALL_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${IDLEMMO_ITEM_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Load all items of this type from DB
  const rows = await db
    .select({ hashedId: items.hashedId })
    .from(items)
    .where(eq(items.type, type));

  if (rows.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, total: 0 });
  }

  const reqHeaders = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };
  let synced  = 0;
  let skipped = 0;
  let remaining = 20;
  let resetAt   = 0; // unix seconds

  for (const { hashedId } of rows) {
    // Wait if rate limit is exhausted
    if (remaining <= 0) {
      const waitMs = Math.max(500, resetAt * 1000 - Date.now() + 200);
      await new Promise((r) => setTimeout(r, waitMs));
      remaining = 20; // reset optimistically
    }

    try {
      const res = await fetch(
        `${BASE}/v1/item/${hashedId}/market-history?tier=0&type=listings`,
        { headers: reqHeaders, cache: "no-store" }
      );

      // Track rate limit from response headers
      const rem = res.headers.get("x-ratelimit-remaining");
      const rst = res.headers.get("x-ratelimit-reset");
      if (rem !== null) remaining = parseInt(rem, 10);
      if (rst !== null) resetAt   = parseInt(rst, 10);
      if (res.status === 429) { remaining = 0; skipped++; continue; }
      if (!res.ok) { skipped++; continue; }

      const data   = await res.json();
      const latest = Array.isArray(data.latest_sold) && data.latest_sold.length > 0
        ? data.latest_sold[0]
        : null;

      if (!latest?.price_per_item) { skipped++; continue; }

      const soldAt = new Date(latest.sold_at);
      const price  = latest.price_per_item as number;

      // Update item row
      await db
        .update(items)
        .set({ lastSoldPrice: price, lastSoldAt: soldAt })
        .where(eq(items.hashedId, hashedId));

      // Persist to price history (best-effort, ignore duplicates)
      try {
        await db.insert(marketPriceHistory).values({
          id:           randomUUID(),
          itemHashedId: hashedId,
          price,
          quantity:     latest.quantity ?? 1,
          soldAt,
          recordedAt:   new Date(),
        }).onConflictDoNothing();
      } catch { /* non-blocking */ }

      synced++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ synced, skipped, total: rows.length });
}
