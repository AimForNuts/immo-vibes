import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getItemZoneIds, replaceItemZones } from "@/lib/services/admin/zones.service";

async function requireAdmin(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

/**
 * GET /api/items/[id]/zones
 *
 * Returns the zone IDs currently associated with this item.
 * Admin-only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const zone_ids = await getItemZoneIds(id);
  return NextResponse.json({ zone_ids });
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
  if (!await requireAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Verify item exists
  const [item] = await db.select({ hashedId: items.hashedId }).from(items).where(eq(items.hashedId, id)).limit(1);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  let body: { zone_ids?: unknown };
  try {
    body = await req.json() as { zone_ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const zone_ids: number[] = Array.isArray(body.zone_ids)
    ? (body.zone_ids as unknown[]).filter((v): v is number => Number.isInteger(v))
    : [];

  await replaceItemZones(id, zone_ids);
  return NextResponse.json({ zone_ids });
}
