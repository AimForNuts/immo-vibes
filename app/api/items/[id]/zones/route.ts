import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemZones } from "@/lib/db/schema";

/**
 * GET /api/items/[id]/zones
 *
 * Returns the zone IDs currently associated with this item.
 * Admin-only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const rows = await db
    .select({ zoneId: itemZones.zoneId })
    .from(itemZones)
    .where(eq(itemZones.itemHashedId, id));

  return NextResponse.json({ zone_ids: rows.map((r) => r.zoneId) });
}

/**
 * PUT /api/items/[id]/zones
 *
 * Replaces all zone associations for this item.
 * Body: { zone_ids: number[] }
 * Admin-only.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { zone_ids?: unknown };
  const zoneIds: number[] = Array.isArray(body.zone_ids)
    ? (body.zone_ids as unknown[]).filter((v): v is number => typeof v === "number")
    : [];

  await db.transaction(async (tx) => {
    await tx.delete(itemZones).where(eq(itemZones.itemHashedId, id));
    if (zoneIds.length > 0) {
      await tx.insert(itemZones).values(
        zoneIds.map((zoneId) => ({ itemHashedId: id, zoneId }))
      );
    }
  });

  return NextResponse.json({ zone_ids: zoneIds });
}
