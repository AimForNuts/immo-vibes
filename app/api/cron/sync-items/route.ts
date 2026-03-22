import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, syncState } from "@/lib/db/schema";
import { searchItemsByType, IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

export const maxDuration = 300;

/**
 * POST /api/cron/sync-items
 *
 * Weekly item catalog sync — refreshes the items table (name, type, quality,
 * image_url, vendor_price) for all item types.
 *
 * Runs Monday 00:00 UTC. Marks sync_state job='items' done on completion
 * so the downstream recipes cron can gate on it.
 *
 * Protected by CRON_SECRET (set automatically by Vercel).
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

  // Mark running
  await db
    .insert(syncState)
    .values({ job: "items", status: "running", startedAt: new Date(), completedAt: null })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "running", startedAt: new Date(), completedAt: null },
    });

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
      console.error(`[cron/sync-items] Failed to sync type ${type}`);
    }
  }

  // Mark done
  await db
    .insert(syncState)
    .values({ job: "items", status: "done", completedAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.job,
      set: { status: "done", completedAt: new Date() },
    });

  return NextResponse.json({ synced: totalSynced, types: IDLEMMO_ITEM_TYPES.length });
}
