import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dungeons } from "@/lib/db/schema";
import { getDungeons } from "@/lib/idlemmo";

/**
 * POST /api/admin/sync-dungeons
 *
 * Fetches all dungeons from the IdleMMO API and upserts them into the
 * `dungeons` table. Admin-only.
 *
 * Response: { synced: number }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) {
    return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });
  }

  let apiDungeons;
  try {
    apiDungeons = await getDungeons(token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const now = new Date();

  const rows = apiDungeons.map((d) => ({
    id:            d.id,
    name:          d.name,
    imageUrl:      d.image_url ?? null,
    levelRequired: d.level_required,
    difficulty:    d.difficulty,
    durationMs:    d.length,
    goldCost:      d.cost,
    shards:        d.shards ?? 0,
    loot:          (d.loot ?? []).length > 0 ? d.loot : null,
    syncedAt:      now,
  }));

  if (rows.length > 0) {
    await db
      .insert(dungeons)
      .values(rows)
      .onConflictDoUpdate({
        target: dungeons.id,
        set: {
          name:          sql`excluded.name`,
          imageUrl:      sql`excluded.image_url`,
          levelRequired: sql`excluded.level_required`,
          difficulty:    sql`excluded.difficulty`,
          durationMs:    sql`excluded.duration_ms`,
          goldCost:      sql`excluded.gold_cost`,
          shards:        sql`excluded.shards`,
          loot:          sql`excluded.loot`,
          syncedAt:      sql`excluded.synced_at`,
        },
      });
  }

  return NextResponse.json({ synced: rows.length });
}
