import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminDungeons } from "@/lib/services/admin/dungeons.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const rawPage     = Number(searchParams.get("page") ?? 1);
  const rawPageSize = Number(searchParams.get("pageSize") ?? 25);
  const page        = isNaN(rawPage)     ? 1  : Math.max(1, rawPage);
  const pageSize    = isNaN(rawPageSize) ? 25 : Math.min(100, Math.max(1, rawPageSize));
  const name        = searchParams.get("name") ?? undefined;
  const rawMinLevel = searchParams.get("minLevel");
  const minLevel    = rawMinLevel && !isNaN(Number(rawMinLevel)) ? Number(rawMinLevel) : undefined;

  const result = await getAdminDungeons({ page, pageSize, name, minLevel });
  return NextResponse.json(result);
}
