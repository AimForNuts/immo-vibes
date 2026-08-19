import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getItemZoneIds, replaceItemZones } from "@/lib/services/admin/zones.service";
import { itemExists } from "@/lib/services/items.service";
import { invalidRequest, parseIntegerArrayField, readJsonObject } from "@/lib/validation/api";

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
  if (!await itemExists(id)) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const body = await readJsonObject(req);
  if (!body.ok) return invalidRequest(body.message);

  const zone_ids = parseIntegerArrayField(body.data, "zone_ids");
  if (!zone_ids.ok) return invalidRequest(zone_ids.message);

  await replaceItemZones(id, zone_ids.data);
  return NextResponse.json({ zone_ids: zone_ids.data });
}
