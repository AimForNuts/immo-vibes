import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getZoneDetail, updateZone, deleteZone } from "@/lib/services/admin/zones.service";
import type { ZoneEnemy, ZoneDungeon, ZoneWorldBoss } from "@/lib/services/admin/zones.service";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.role === "admin" ? session : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const zone = await getZoneDetail(Number(id));
  if (!zone) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(zone);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json() as {
    name?: string;
    levelRequired?: number;
    enemies?: ZoneEnemy[];
    dungeons?: ZoneDungeon[];
    worldBosses?: ZoneWorldBoss[];
  };
  const zone = await updateZone(Number(id), body);
  return NextResponse.json(zone);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await deleteZone(Number(id));
  return new NextResponse(null, { status: 204 });
}
