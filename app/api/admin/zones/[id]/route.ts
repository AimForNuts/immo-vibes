import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getZoneDetail, updateZone, deleteZone } from "@/lib/services/admin/zones.service";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss } from "@/lib/services/admin/zones.service";
import {
  invalidRequest,
  parseArrayField,
  parseNonNegativeIntegerField,
  parsePositiveInteger,
  parseStringField,
  readJsonObject,
} from "@/lib/validation/api";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.role === "admin" ? session : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const zoneId = parsePositiveInteger(id, "id");
  if (!zoneId.ok) return invalidRequest(zoneId.message);

  const zone = await getZoneDetail(zoneId.data);
  if (!zone) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(zone);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const zoneId = parsePositiveInteger(id, "id");
  if (!zoneId.ok) return invalidRequest(zoneId.message);

  const body = await readJsonObject(request);
  if (!body.ok) return invalidRequest(body.message);

  const name = parseStringField(body.data, "name");
  if (!name.ok) return invalidRequest(name.message);

  const levelRequired = parseNonNegativeIntegerField(body.data, "levelRequired");
  if (!levelRequired.ok) return invalidRequest(levelRequired.message);

  const enemies = parseArrayField<ZoneEnemy>(body.data, "enemies");
  if (!enemies.ok) return invalidRequest(enemies.message);

  const dungeons = parseArrayField<ZoneDungeon>(body.data, "dungeons");
  if (!dungeons.ok) return invalidRequest(dungeons.message);

  const worldBosses = parseArrayField<ZoneWorldBoss>(body.data, "worldBosses");
  if (!worldBosses.ok) return invalidRequest(worldBosses.message);

  const zone = await updateZone(zoneId.data, {
    ...(name.data !== undefined && { name: name.data }),
    ...(typeof levelRequired.data === "number" && { levelRequired: levelRequired.data }),
    ...(enemies.data !== undefined && { enemies: enemies.data }),
    ...(dungeons.data !== undefined && { dungeons: dungeons.data }),
    ...(worldBosses.data !== undefined && { worldBosses: worldBosses.data }),
  });
  return NextResponse.json(zone);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const zoneId = parsePositiveInteger(id, "id");
  if (!zoneId.ok) return invalidRequest(zoneId.message);

  await deleteZone(zoneId.data);
  return new NextResponse(null, { status: 204 });
}
