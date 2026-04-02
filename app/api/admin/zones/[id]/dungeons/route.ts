import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addDungeonToZone, removeDungeonFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { dungeonId } = await request.json() as { dungeonId: number };
  await addDungeonToZone(Number(id), Number(dungeonId));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { dungeonId } = await request.json() as { dungeonId: number };
  await removeDungeonFromZone(Number(dungeonId));
  return new NextResponse(null, { status: 204 });
}
