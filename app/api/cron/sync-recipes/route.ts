import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, syncState } from "@/lib/db/schema";

export const maxDuration = 300;

const BASE            = "https://api.idle-mmo.com";
const PAGE_SIZE       = 80;
const NO_RECIPE_SENTINEL = "NONE";

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
 * POST /api/cron/sync-recipes
 *
 * Weekly recipe sync — for each RECIPE item missing recipe_result_hashed_id,
 * calls /v1/item/{id}/inspect and persists the result.
 *
 * Gates on items sync having completed today. After the initial population run
 * this is effectively a no-op (all RECIPE items already have the field set).
 *
 * Runs Monday 01:00 UTC. Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gate: items must have completed today
  const itemsStateRows = await db
    .select({ status: syncState.status, completedAt: syncState.completedAt })
    .from(syncState)
    .where(eq(syncState.job, "items"))
    .limit(1);
  const itemsState = itemsStateRows[0];

  if (!itemsState || itemsState.status !== "done" || !isToday(itemsState.completedAt)) {
    return NextResponse.json({ skipped: true, reason: "items sync not completed today" });
  }

  const adminRow = await db.execute(
    sql`SELECT idlemmo_token FROM "user" WHERE role = 'admin' AND idlemmo_token IS NOT NULL LIMIT 1`
  );
  const token = (adminRow.rows[0] as { idlemmo_token: string } | undefined)?.idlemmo_token;
  if (!token) {
    return NextResponse.json({ error: "No admin IdleMMO token configured" }, { status: 500 });
  }

  // Mark running
  await db
    .insert(syncState)
    .values({ job: "recipes", status: "running", startedAt: new Date(), completedAt: null })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "running", startedAt: new Date(), completedAt: null },
    });

  const nullCondition = and(eq(items.type, "RECIPE"), isNull(items.recipeResultHashedId));
  const reqHeaders = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "ImmoWebSuite/1.0",
  };

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

  let populated = 0;
  let noData    = 0;
  let errors    = 0;
  let page      = 1;

  // Process all pages within this single invocation
  while (true) {
    const rows = await db
      .select({ hashedId: items.hashedId })
      .from(items)
      .where(nullCondition)
      .orderBy(items.hashedId)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    if (rows.length === 0) break;

    for (const { hashedId } of rows) {
      try {
        const res = await rateLimitedFetch(`${BASE}/v1/item/${hashedId}/inspect`);

        if (res.ok) {
          const data = await res.json();
          const recipeResultHashedId = data.item?.recipe?.result?.hashed_item_id ?? null;

          await db
            .update(items)
            .set({ recipeResultHashedId: recipeResultHashedId ?? NO_RECIPE_SENTINEL })
            .where(eq(items.hashedId, hashedId));

          if (recipeResultHashedId) populated++; else noData++;
        } else {
          console.error(`[cron/sync-recipes] ${hashedId}: HTTP ${res.status}`);
          errors++;
        }
      } catch (err) {
        console.error(`[cron/sync-recipes] ${hashedId}: error`, err);
        errors++;
      }
    }

    page++;
  }

  // Mark done
  await db
    .insert(syncState)
    .values({ job: "recipes", status: "done", completedAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "done", completedAt: new Date() },
    });

  return NextResponse.json({ populated, noData, errors });
}
