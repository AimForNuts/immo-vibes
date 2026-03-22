import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { items, marketPriceHistory, syncState } from "@/lib/db/schema";
import { IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

export const maxDuration = 300;

const BASE      = "https://api.idle-mmo.com";
const PAGE_SIZE = 80;

/** Returns true if the given date is today (UTC). */
function isToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth()    === now.getUTCMonth()    &&
    date.getUTCDate()     === now.getUTCDate()
  );
}

/**
 * POST /api/cron/sync-prices
 *
 * Paginated price sync that resumes across invocations using sync_state.
 *
 * Each call processes one page (PAGE_SIZE items) of the current type, then
 * persists progress. The next invocation picks up where this one left off.
 * When all types and pages are exhausted, status is set to 'done' and
 * subsequent calls become no-ops until the following week.
 *
 * Gates on recipes sync having completed today before starting a fresh run.
 * In-progress runs continue regardless (no need to re-check the gate).
 *
 * Runs every 10 minutes all day Monday (*/10 * * * 1). Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read current prices sync state
  const stateRows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.job, "prices"))
    .limit(1);
  const state = stateRows[0];

  // Already completed this week (today) — nothing to do
  if (state?.status === "done" && isToday(state.completedAt)) {
    return NextResponse.json({ skipped: true, reason: "already completed today" });
  }

  // Not yet running — need to start a fresh run; gate on recipes being done today
  if (!state || state.status !== "running") {
    const recipesRows = await db
      .select({ status: syncState.status, completedAt: syncState.completedAt })
      .from(syncState)
      .where(eq(syncState.job, "recipes"))
      .limit(1);
    const recipesState = recipesRows[0];

    if (!recipesState || recipesState.status !== "done" || !isToday(recipesState.completedAt)) {
      return NextResponse.json({ skipped: true, reason: "recipes sync not completed today" });
    }

    // Start fresh
    await db
      .insert(syncState)
      .values({
        job: "prices", status: "running",
        currentTypeIndex: 0, currentPage: 1,
        startedAt: new Date(), completedAt: null,
      })
      .onConflictDoUpdate({
        target: syncState.job,
        set: {
          status: "running",
          currentTypeIndex: 0, currentPage: 1,
          startedAt: new Date(), completedAt: null,
        },
      });

    // Re-read to get the fresh state
    const freshRows = await db.select().from(syncState).where(eq(syncState.job, "prices")).limit(1);
    Object.assign(state ?? {}, freshRows[0]);
    // Use freshRows[0] for the rest of the function
    return await processPage(request, freshRows[0]);
  }

  return await processPage(request, state);
}

async function processPage(
  _request: NextRequest,
  state: { currentTypeIndex: number; currentPage: number }
) {
  const adminRow = await db.execute(
    sql`SELECT idlemmo_token FROM "user" WHERE role = 'admin' AND idlemmo_token IS NOT NULL LIMIT 1`
  );
  const token = (adminRow.rows[0] as { idlemmo_token: string } | undefined)?.idlemmo_token;
  if (!token) {
    return NextResponse.json({ error: "No admin IdleMMO token configured" }, { status: 500 });
  }

  let { currentTypeIndex, currentPage } = state;

  // Skip exhausted types
  while (currentTypeIndex < IDLEMMO_ITEM_TYPES.length) {
    const type = IDLEMMO_ITEM_TYPES[currentTypeIndex];

    const rows = await db
      .select({ hashedId: items.hashedId })
      .from(items)
      .where(eq(items.type, type))
      .orderBy(items.hashedId)
      .limit(PAGE_SIZE)
      .offset((currentPage - 1) * PAGE_SIZE);

    if (rows.length > 0) {
      // Found a page to process — proceed
      const result = await syncPricePage(rows.map((r) => r.hashedId), token);

      // Advance: check if there are more pages in this type
      const nextPageRows = await db
        .select({ hashedId: items.hashedId })
        .from(items)
        .where(eq(items.type, type))
        .orderBy(items.hashedId)
        .limit(1)
        .offset(currentPage * PAGE_SIZE);

      if (nextPageRows.length > 0) {
        // More pages for this type
        await db
          .insert(syncState)
          .values({ job: "prices", status: "running", currentTypeIndex, currentPage: currentPage + 1 })
          .onConflictDoUpdate({
            target: syncState.job,
            set: { currentTypeIndex, currentPage: currentPage + 1 },
          });
      } else {
        // Move to next type
        await db
          .insert(syncState)
          .values({ job: "prices", status: "running", currentTypeIndex: currentTypeIndex + 1, currentPage: 1 })
          .onConflictDoUpdate({
            target: syncState.job,
            set: { currentTypeIndex: currentTypeIndex + 1, currentPage: 1 },
          });
      }

      return NextResponse.json({
        type,
        page: currentPage,
        ...result,
        nextTypeIndex: nextPageRows.length > 0 ? currentTypeIndex : currentTypeIndex + 1,
      });
    }

    // This type has no items at this page offset — advance to next type
    currentTypeIndex++;
    currentPage = 1;
  }

  // All types exhausted — mark done
  await db
    .insert(syncState)
    .values({ job: "prices", status: "done", completedAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "done", completedAt: new Date() },
    });

  return NextResponse.json({ done: true });
}

async function syncPricePage(hashedIds: string[], token: string) {
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
      rl.remaining = 0;
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new Error(`Max retries (${MAX_RETRIES}) exceeded`);
  }

  let synced  = 0;
  let skipped = 0;

  for (const hashedId of hashedIds) {
    try {
      const res = await rateLimitedFetch(
        `${BASE}/v1/item/${hashedId}/market-history?tier=0&type=listings`
      );

      if (res.ok) {
        const data   = await res.json();
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
              id: randomUUID(), itemHashedId: hashedId,
              price, quantity: latest.quantity ?? 1,
              soldAt, recordedAt: new Date(),
            }).onConflictDoNothing();
          } catch { /* non-blocking */ }

          synced++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  return { synced, skipped };
}
