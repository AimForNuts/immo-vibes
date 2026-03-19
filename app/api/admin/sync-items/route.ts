import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { searchItemsByType } from "@/lib/idlemmo";

const EQUIPMENT_TYPES = [
  "SWORD", "DAGGER", "BOW", "SHIELD",
  "HELMET", "CHESTPLATE", "GREAVES", "GAUNTLETS", "BOOTS",
] as const;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) {
    return NextResponse.json({ error: "No IdleMMO API token configured" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();

  if (!type || !(EQUIPMENT_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${EQUIPMENT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const fetched = await searchItemsByType(type, token);
  const now = new Date();

  if (fetched.length > 0) {
    await db
      .insert(items)
      .values(
        fetched.map((item) => ({
          hashedId: item.hashed_id,
          name: item.name,
          type: item.type.toUpperCase(),
          quality: item.quality.toUpperCase(),
          imageUrl: item.image_url ?? null,
          syncedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: items.hashedId,
        set: {
          name: sql`excluded.name`,
          type: sql`excluded.type`,
          quality: sql`excluded.quality`,
          imageUrl: sql`excluded.image_url`,
          syncedAt: now,
        },
      });
  }

  return NextResponse.json({ type, synced: fetched.length });
}
