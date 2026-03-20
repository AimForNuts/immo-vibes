import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

const BASE = "https://api.idle-mmo.com";

/**
 * POST /api/admin/sync-recipes
 *
 * Fetches all RECIPE-type items from the IdleMMO API, inspects each one to
 * get the recipe's result item, and persists:
 *   - The RECIPE item itself into the items table (upsert)
 *   - The recipe_result_hashed_id column: what item this scroll produces
 *
 * This is the only way to know "what does this recipe scroll craft?" without
 * calling inspect at browse time.
 *
 * Rate-limit aware: reads the user's rate limit from /v1/auth/check and
 * adds an inter-request delay to stay within quota.
 *
 * Response: { synced: number, total: number }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });

  // Read the user's rate limit so we can pace our inspect calls
  let rateLimit = 20;
  try {
    const authRes = await fetch(`${BASE}/v1/auth/check`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
      cache: "no-store",
    });
    if (authRes.ok) {
      const authData = await authRes.json();
      rateLimit = authData.api_key?.rate_limit ?? 20;
    }
  } catch { /* use default */ }

  // ms to wait between each API call to stay safely under the rate limit
  const delayMs = Math.ceil(60_000 / rateLimit) + 200;

  // ── Step 1: Fetch all RECIPE items (auto-paginate) ────────────────────────
  const recipeItems: Array<{ hashed_id: string; name: string; quality: string; image_url: string | null }> = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${BASE}/v1/item/search?type=RECIPE&page=${page}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
      cache: "no-store",
    });

    if (!res.ok) break;

    const data = await res.json();
    if (!Array.isArray(data.items) || data.items.length === 0) break;

    recipeItems.push(...data.items);
    if (data.pagination?.current_page >= data.pagination?.last_page) break;

    page++;
    await new Promise((r) => setTimeout(r, delayMs));
  }

  // ── Step 2: Inspect each RECIPE item to get recipe.result ─────────────────
  let synced = 0;
  const now = new Date();

  for (const item of recipeItems) {
    await new Promise((r) => setTimeout(r, delayMs));

    let recipeResultHashedId: string | null = null;

    try {
      const inspectRes = await fetch(`${BASE}/v1/item/${item.hashed_id}/inspect`, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
        cache: "no-store",
      });

      if (inspectRes.ok) {
        const inspectData = await inspectRes.json();
        recipeResultHashedId = inspectData.item?.recipe?.result?.hashed_item_id ?? null;
      }
    } catch { /* skip this item on error */ }

    // Upsert the RECIPE item + its recipe result
    try {
      await db
        .insert(items)
        .values({
          hashedId:             item.hashed_id,
          name:                 item.name,
          type:                 "RECIPE",
          quality:              item.quality.toUpperCase(),
          imageUrl:             item.image_url ?? null,
          syncedAt:             now,
          recipeResultHashedId,
        })
        .onConflictDoUpdate({
          target: items.hashedId,
          set: {
            name:                 sql`excluded.name`,
            quality:              sql`excluded.quality`,
            imageUrl:             sql`excluded.image_url`,
            syncedAt:             now,
            recipeResultHashedId: sql`excluded.recipe_result_hashed_id`,
          },
        });

      synced++;
    } catch { /* skip DB errors */ }
  }

  return NextResponse.json({ synced, total: recipeItems.length });
}
