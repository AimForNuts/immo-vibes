import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketPriceHistory } from "@/lib/db/schema";
import { IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";
import { recordSyncLog } from "@/lib/services/admin/sync-logs.service";
import { countItemsByType, getItemIdsByType, updateItemPriceFields, updateRecipeResult } from "@/lib/services/items.service";

export const maxDuration = 300;

const BASE      = "https://api.idle-mmo.com";
const ALL_TYPES = IDLEMMO_ITEM_TYPES as readonly string[];
const PAGE_SIZE_DEFAULT = 80;
const PAGE_SIZE_MAX     = 200;

/**
 * POST /api/admin/sync-prices?type=SWORD&page=1&pageSize=80
 *
 * Fetches the latest market-history entry for one page of items of the given
 * type and updates items.last_sold_price / last_sold_at.
 * Also inserts records into market_price_history for historical tracking.
 *
 * Pagination keeps each call within Vercel's 300s maxDuration:
 * at 20 req/min, 80 items ≈ 4 rate-limit windows ≈ 4 min.
 *
 * Rate-limit aware: reads X-RateLimit-Remaining and X-RateLimit-Reset from
 * every response and waits exactly as long as the API instructs.
 * Retries automatically on 429 (up to MAX_RETRIES). Never loops infinitely.
 *
 * Response: { synced, skipped, total, page, totalPages }
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

  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10))
  );

  await recordSyncLog({
    job: "prices",
    status: "started",
    message: `Started price sync for ${type} page ${page}`,
    details: { type, page, pageSize },
    userId: session.user.id,
  });

  // Total count for this type (used for totalPages in response)
  const total = await countItemsByType(type);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    await recordSyncLog({
      job: "prices",
      status: "skipped",
      message: `Skipped price sync for ${type}: no local items`,
      details: { type, page: 1, totalPages: 1, synced: 0, skipped: 0, total: 0 },
      userId: session.user.id,
    });
    return NextResponse.json({ synced: 0, skipped: 0, total: 0, page: 1, totalPages: 1 });
  }

  // Paginated item fetch
  const rows = await getItemIdsByType(type, page, pageSize);

  const reqHeaders = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };
  let synced  = 0;
  let skipped = 0;

  // Header-driven rate limit state — no hardcoded assumptions
  const rl = { remaining: null as number | null, resetAt: 0 };
  const MAX_RETRIES = 10;

  async function rateLimitedFetch(url: string): Promise<Response> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (rl.remaining !== null && rl.remaining <= 0) {
        const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      const res = await fetch(url, { headers: reqHeaders, cache: "no-store" });
      const rem = res.headers.get("x-ratelimit-remaining");
      const rst = res.headers.get("x-ratelimit-reset");
      if (rem !== null) rl.remaining = parseInt(rem, 10);
      if (rst !== null) rl.resetAt   = parseInt(rst, 10);

      if (res.status !== 429) return res;

      // 429 — wait exactly as long as the API instructs, then retry
      rl.remaining = 0;
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
  }

  for (const { hashedId, recipeResultHashedId } of rows) {
    try {
      // One API call per item — the response includes latest_sold entries for ALL tiers.
      // Previously we made a separate call per tier (up to 35×), causing timeouts on
      // gear types. Now we extract every tier from this single response.
      const priceRes = await rateLimitedFetch(
        `${BASE}/v1/item/${hashedId}/market-history?tier=0&type=listings`
      );

      if (priceRes.ok) {
        const data     = await priceRes.json();
        const allSales = Array.isArray(data.latest_sold) ? data.latest_sold : [];
        // API returns 1-based tiers in latest_sold (tier=1 → game tier 1)
        const tier1    = allSales.find((s: { tier: number }) => s.tier === 1) ?? null;
        const now      = new Date();

        if (tier1?.price_per_item) {
          const price  = tier1.price_per_item as number;
          const soldAt = new Date(tier1.sold_at);

          await updateItemPriceFields({ hashedId, lastSoldPrice: price, lastSoldAt: soldAt, priceCheckedAt: now });

          try {
            await db.insert(marketPriceHistory).values({
              id: randomUUID(), itemHashedId: hashedId, tier: 1,
              price, quantity: tier1.quantity ?? 1, soldAt, recordedAt: now,
            }).onConflictDoNothing();
          } catch { /* non-blocking */ }

          synced++;
        } else {
          await updateItemPriceFields({ hashedId, priceCheckedAt: new Date() });
          skipped++;
        }

        // Persist all higher-tier sales from the same response — no extra API calls needed
        for (const sale of allSales) {
          if (sale.tier === 1 || !sale.price_per_item) continue; // tier 1 already handled
          try {
            await db.insert(marketPriceHistory).values({
              id: randomUUID(), itemHashedId: hashedId,
              tier:       sale.tier, // response tier is already 1-based game tier
              price:      sale.price_per_item as number,
              quantity:   sale.quantity ?? 1,
              soldAt:     new Date(sale.sold_at),
              recordedAt: new Date(),
            }).onConflictDoNothing();
          } catch { /* non-blocking */ }
        }
      } else {
        skipped++;
      }

      // ── RECIPE items: inspect to populate recipe_result_hashed_id ─────────
      // Skip if already known — avoids doubling API calls on repeat syncs
      if (type === "RECIPE" && !recipeResultHashedId) {
        const inspectRes = await rateLimitedFetch(`${BASE}/v1/item/${hashedId}/inspect`);
        if (inspectRes.ok) {
          const inspectData = await inspectRes.json();
          const resultId = inspectData.item?.recipe?.result?.hashed_item_id ?? null;
          if (resultId) {
            await updateRecipeResult(hashedId, resultId);
          }
        }
      }
    } catch {
      skipped++;
    }
  }

  await recordSyncLog({
    job: "prices",
    status: skipped > 0 ? "progress" : "success",
    message: `Price sync ${type} page ${page}/${totalPages}: ${synced} synced, ${skipped} skipped`,
    details: { type, page, pageSize, total, totalPages, synced, skipped },
    userId: session.user.id,
  });

  return NextResponse.json({ synced, skipped, total, page, totalPages });
}
