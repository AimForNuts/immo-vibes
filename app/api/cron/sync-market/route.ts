import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { searchItemsByType, IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

/**
 * POST /api/cron/sync-market
 *
 * Nightly catalog sync — refreshes the items table (name, type, quality,
 * image_url, vendor_price) for all item types. Does NOT sync prices; use
 * POST /api/admin/sync-prices?type=X for that.
 *
 * Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET.
 *
 * Vercel provides the secret automatically as:
 *   Authorization: Bearer {CRON_SECRET}
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the first admin token we can find (stored on the admin user row)
  const adminRow = await db.execute(
    sql`SELECT idlemmo_token FROM "user" WHERE role = 'admin' AND idlemmo_token IS NOT NULL LIMIT 1`
  );
  const token = (adminRow.rows[0] as { idlemmo_token: string } | undefined)?.idlemmo_token;
  if (!token) {
    return NextResponse.json({ error: "No admin IdleMMO token configured" }, { status: 500 });
  }

  const now = new Date();
  let totalSynced = 0;

  for (const type of IDLEMMO_ITEM_TYPES) {
    try {
      const fetched = await searchItemsByType(type, token);
      if (fetched.length === 0) continue;

      await db
        .insert(items)
        .values(
          fetched.map((item) => ({
            hashedId:    item.hashed_id,
            name:        item.name,
            type:        item.type.toUpperCase(),
            quality:     item.quality.toUpperCase(),
            imageUrl:    item.image_url ?? null,
            vendorPrice: item.vendor_price ?? null,
            syncedAt:    now,
          }))
        )
        .onConflictDoUpdate({
          target: items.hashedId,
          set: {
            name:        sql`excluded.name`,
            type:        sql`excluded.type`,
            quality:     sql`excluded.quality`,
            imageUrl:    sql`excluded.image_url`,
            vendorPrice: sql`excluded.vendor_price`,
            syncedAt:    now,
          },
        });

      totalSynced += fetched.length;
    } catch {
      // Log and continue — don't let one type failure abort the whole run
      console.error(`[cron/sync-market] Failed to sync type ${type}`);
    }
  }

  return NextResponse.json({ synced: totalSynced, types: IDLEMMO_ITEM_TYPES.length });
}
