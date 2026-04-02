import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminUsers } from "@/lib/services/admin/users.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const rawPage     = Number(searchParams.get("page") ?? 1);
  const rawPageSize = Number(searchParams.get("pageSize") ?? 25);
  const page     = isNaN(rawPage)     ? 1  : Math.max(1, rawPage);
  const pageSize = isNaN(rawPageSize) ? 25 : Math.min(100, Math.max(1, rawPageSize));
  const search   = searchParams.get("search") ?? undefined;
  const role     = searchParams.get("role")   ?? undefined;

  return NextResponse.json(await getAdminUsers({ page, pageSize, search, role }));
}
