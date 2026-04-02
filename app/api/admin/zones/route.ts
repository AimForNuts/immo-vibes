import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminZones, createZone } from "@/lib/services/admin/zones.service";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return null;
  return session;
}

export async function GET(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const rawPage     = Number(searchParams.get("page") ?? 1);
  const rawPageSize = Number(searchParams.get("pageSize") ?? 25);
  const page     = isNaN(rawPage)     ? 1  : Math.max(1, rawPage);
  const pageSize = isNaN(rawPageSize) ? 25 : Math.min(100, Math.max(1, rawPageSize));
  const name     = searchParams.get("name") ?? undefined;

  return NextResponse.json(await getAdminZones({ page, pageSize, name }));
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json() as { name?: string; levelRequired?: unknown };
  const { name, levelRequired } = body;
  if (!name || levelRequired == null) {
    return NextResponse.json({ error: "name and levelRequired are required" }, { status: 400 });
  }

  const zone = await createZone({ name, levelRequired: Number(levelRequired) });
  return NextResponse.json(zone, { status: 201 });
}
