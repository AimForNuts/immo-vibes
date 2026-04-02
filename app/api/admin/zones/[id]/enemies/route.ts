import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addEnemyToZone, removeEnemyFromZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(r: NextRequest) {
  const s = await auth.api.getSession({ headers: r.headers });
  return s?.user.role === "admin" ? s : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { enemyId } = await request.json() as { enemyId: number };
  await addEnemyToZone(Number(id), Number(enemyId));
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { enemyId } = await request.json() as { enemyId: number };
  await removeEnemyFromZone(Number(enemyId));
  return new NextResponse(null, { status: 204 });
}
