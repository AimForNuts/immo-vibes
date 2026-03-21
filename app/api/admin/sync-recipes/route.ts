import { NextRequest, NextResponse } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

export const maxDuration = 300;

const BASE = "https://api.idle-mmo.com";
const PAGE_SIZE_DEFAULT = 80;
const PAGE_SIZE_MAX     = 200;
// Sentinel stored when the API confirms an item has no recipe result.
// Excluded from future syncs via the isNull(recipeResultHashedId) filter.
const NO_RECIPE_SENTINEL = "NONE";

/**
 * POST /api/admin/sync-recipes?page=1&pageSize=80
 *
 * For each RECIPE item in the DB that is missing recipe_result_hashed_id,
 * calls /v1/item/{hashedId}/inspect and persists the result.
 *
 * Only processes items with recipe_result_hashed_id IS NULL — already-populated
 * items are skipped entirely (no API call), so this is safe to re-run.
 *
 * Pagination keeps each call within Vercel's 300s maxDuration:
 * at 20 req/min, 80 items ≈ 4 rate-limit windows ≈ 4 min.
 *
 * Response: { populated, noData, errors, total, page, totalPages }
 *   total     — RECIPE items still missing recipe_result_hashed_id at call time
 *   totalPages — based on that total; re-running after completion returns 0/1/1
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE_DEFAULT), 10))
  );

  const nullCondition = and(eq(items.type, "RECIPE"), isNull(items.recipeResultHashedId));

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(items)
    .where(nullCondition);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return NextResponse.json({ populated: 0, noData: 0, errors: 0, total: 0, page: 1, totalPages: 1 });
  }

  const rows = await db
    .select({ hashedId: items.hashedId })
    .from(items)
    .where(nullCondition)
    .orderBy(items.hashedId)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const reqHeaders = { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" };
  let populated = 0;
  let noData    = 0;
  let errors    = 0;

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

      rl.remaining = 0;
      const waitMs = Math.max(1000, rl.resetAt * 1000 - Date.now() + 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    throw new Error(`Max retries (${MAX_RETRIES}) exceeded — API returning persistent 429`);
  }

  for (const { hashedId } of rows) {
    try {
      const res = await rateLimitedFetch(`${BASE}/v1/item/${hashedId}/inspect`);

      if (res.ok) {
        const data                 = await res.json();
        const recipeResultHashedId = data.item?.recipe?.result?.hashed_item_id ?? null;

        if (recipeResultHashedId) {
          await db
            .update(items)
            .set({ recipeResultHashedId })
            .where(eq(items.hashedId, hashedId));
          populated++;
        } else {
          // API returned no recipe result — mark with sentinel so this item is
          // excluded from future syncs (isNull filter won't select it)
          await db
            .update(items)
            .set({ recipeResultHashedId: NO_RECIPE_SENTINEL })
            .where(eq(items.hashedId, hashedId));
          noData++;
        }
      } else {
        console.error(`[sync-recipes] ${hashedId}: HTTP ${res.status}`);
        errors++;
      }
    } catch (err) {
      console.error(`[sync-recipes] ${hashedId}: unexpected error`, err);
      errors++;
    }
  }

  return NextResponse.json({ populated, noData, errors, total, page, totalPages });
}
