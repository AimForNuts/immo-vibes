import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, marketPriceHistory } from "@/lib/db/schema";
import { IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

export const maxDuration = 300;

const BASE     = "https://api.idle-mmo.com";
const ALL_TYPES = IDLEMMO_ITEM_TYPES as readonly string[];

/**
 * POST /api/admin/sync-prices?type=SWORD
 *
 * Fetches the latest market-history entry for every item of the given type
 * from the IdleMMO API and updates items.last_sold_price / last_sold_at.
 * Also inserts records into market_price_history for historical tracking.
 *
 * For RECIPE items: additionally calls /inspect to populate
 * recipe_result_hashed_id, making the separate sync-recipes step unnecessary.
 *
 * Rate-limit aware: reads X-RateLimit-Remaining and X-RateLimit-Reset from
 * every response header and waits exactly as long as the API instructs.
 * Retries automatically on 429 instead of failing.
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

  // Header-driven rate limit state — no hardcoded assumptions
  let rlRemaining: number | null = null;
  let rlResetAt = 0;

  async function rateLimitedFetch(url: string): Promise<Response> {
    if (rlRemaining !== null && rlRemaining <= 0) {
      const waitMs = Math.max(1000, rlResetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    const res = await fetch(url, { headers: reqHeaders, cache: "no-store" });
    const rem = res.headers.get("x-ratelimit-remaining");
    const rst = res.headers.get("x-ratelimit-reset");
    if (rem !== null) rlRemaining = parseInt(rem, 10);
    if (rst !== null) rlResetAt   = parseInt(rst, 10);

    if (res.status === 429) {
      rlRemaining = 0;
      const waitMs = Math.max(1000, rlResetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
      return rateLimitedFetch(url); // retry after waiting
    }

    return res;
  }

  for (const { hashedId } of rows) {
    try {
      // ── Market price ──────────────────────────────────────────────────────
      const priceRes = await rateLimitedFetch(
        `${BASE}/v1/item/${hashedId}/market-history?tier=0&type=listings`
      );

      if (priceRes.ok) {
        const data   = await priceRes.json();
        const latest = Array.isArray(data.latest_sold) && data.latest_sold.length > 0
          ? data.latest_sold[0] : null;

        if (latest?.price_per_item) {
          const price  = latest.price_per_item as number;
          const soldAt = new Date(latest.sold_at);

          await db
            .update(items)
            .set({ lastSoldPrice: price, lastSoldAt: soldAt })
            .where(eq(items.hashedId, hashedId));

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
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }

      // ── RECIPE items: inspect to populate recipe_result_hashed_id ─────────
      if (type === "RECIPE") {
        const inspectRes = await rateLimitedFetch(`${BASE}/v1/item/${hashedId}/inspect`);
        if (inspectRes.ok) {
          const inspectData = await inspectRes.json();
          const recipeResultHashedId = inspectData.item?.recipe?.result?.hashed_item_id ?? null;
          if (recipeResultHashedId) {
            await db
              .update(items)
              .set({ recipeResultHashedId })
              .where(eq(items.hashedId, hashedId));
          }
        }
      }
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ synced, skipped, total: rows.length });
}
