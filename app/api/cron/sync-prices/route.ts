import { NextRequest, NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { items, marketPriceHistory, syncState } from "@/lib/db/schema";

export const maxDuration = 300;

const BASE      = "https://api.idle-mmo.com";
const PAGE_SIZE = 80;

/**
 * POST /api/cron/sync-prices
 *
 * Fetches market prices for the next PAGE_SIZE items ordered by
 * price_checked_at ASC NULLS FIRST — items never checked come first,
 * then the ones checked longest ago. This cycles through all items over
 * time with a single daily run, with no external pagination state needed.
 *
 * After fetching each item's price, price_checked_at is updated to now so
 * it moves to the back of the queue on future runs.
 *
 * Runs daily at 04:00 UTC. Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminRow = await db.execute(
    sql`SELECT idlemmo_token FROM "user" WHERE role = 'admin' AND idlemmo_token IS NOT NULL LIMIT 1`
  );
  const token = (adminRow.rows[0] as { idlemmo_token: string } | undefined)?.idlemmo_token;
  if (!token) {
    return NextResponse.json({ error: "No admin IdleMMO token configured" }, { status: 500 });
  }

  // Pick the next PAGE_SIZE items that haven't been checked (or were checked longest ago).
  // Also load maxTier so we can fetch all tiers for upgradeable items.
  const rows = await db
    .select({ hashedId: items.hashedId, maxTier: items.maxTier })
    .from(items)
    .orderBy(asc(items.priceCheckedAt))
    .limit(PAGE_SIZE);

  if (rows.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, total: 0 });
  }

  const reqHeaders = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };
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

  let synced  = 0;
  let skipped = 0;
  const now   = new Date();

  for (const { hashedId, maxTier } of rows) {
    try {
      // Always fetch tier 1 (API uses tier=0 to mean tier 1)
      const res = await rateLimitedFetch(
        `${BASE}/v1/item/${hashedId}/market-history?tier=0&type=listings`
      );

      if (res.ok) {
        const data   = await res.json();
        // The API returns all recent sales across ALL tiers — filter to tier 0 (base tier).
        const latest = Array.isArray(data.latest_sold)
          ? (data.latest_sold.find((s: { tier: number }) => s.tier === 0) ?? null)
          : null;

        if (latest?.price_per_item) {
          const price  = latest.price_per_item as number;
          const soldAt = new Date(latest.sold_at);

          await db
            .update(items)
            .set({ lastSoldPrice: price, lastSoldAt: soldAt, priceCheckedAt: now })
            .where(eq(items.hashedId, hashedId));

          try {
            await db.insert(marketPriceHistory).values({
              id: randomUUID(), itemHashedId: hashedId, tier: 1,
              price, quantity: latest.quantity ?? 1,
              soldAt, recordedAt: now,
            }).onConflictDoNothing();
          } catch { /* non-blocking */ }

          synced++;
        } else {
          // No active listing — still mark as checked so it moves to back of queue
          await db
            .update(items)
            .set({ priceCheckedAt: now })
            .where(eq(items.hashedId, hashedId));
          skipped++;
        }
      } else {
        skipped++;
      }

      // Fetch higher tiers for upgradeable items (maxTier known from sync-inspect)
      if (maxTier !== null && maxTier > 1) {
        for (let t = 2; t <= maxTier; t++) {
          try {
            // IdleMMO API uses 0-based tier values: tier 2 = ?tier=1, etc.
            const tierRes = await rateLimitedFetch(
              `${BASE}/v1/item/${hashedId}/market-history?tier=${t - 1}&type=listings`
            );
            if (!tierRes.ok) continue;
            const tierData   = await tierRes.json();
            // Filter to the specific tier — API uses 0-based tiers in response (t-1 = 0-based tier t).
            const tierLatest = Array.isArray(tierData.latest_sold)
              ? (tierData.latest_sold.find((s: { tier: number }) => s.tier === t - 1) ?? null)
              : null;
            if (!tierLatest?.price_per_item) continue;
            await db.insert(marketPriceHistory).values({
              id: randomUUID(), itemHashedId: hashedId, tier: t,
              price:    tierLatest.price_per_item as number,
              quantity: tierLatest.quantity ?? 1,
              soldAt:   new Date(tierLatest.sold_at),
              recordedAt: now,
            }).onConflictDoNothing();
          } catch { /* non-blocking — don't let a higher-tier failure skip the item */ }
        }
      }
    } catch {
      skipped++;
    }
  }

  // Record completion in sync_state for observability
  await db
    .insert(syncState)
    .values({ job: "prices", status: "done", startedAt: now, completedAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "done", startedAt: now, completedAt: new Date() },
    });

  return NextResponse.json({ synced, skipped, total: rows.length });
}
