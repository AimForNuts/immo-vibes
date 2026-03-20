import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { searchItemsByType, IDLEMMO_ITEM_TYPES } from "@/lib/idlemmo";

export const maxDuration = 300;

const ALL_TYPES = IDLEMMO_ITEM_TYPES as readonly string[];

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

  if (!type || !ALL_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${IDLEMMO_ITEM_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  let fetched;
  try {
    fetched = await searchItemsByType(type, token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const now = new Date();

  if (fetched.length > 0) {
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
  }

  return NextResponse.json({ type, synced: fetched.length });
}
