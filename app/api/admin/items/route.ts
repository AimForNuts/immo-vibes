import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminItems } from "@/lib/services/admin/items.service";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const name     = searchParams.get("name")    ?? undefined;
  const type     = searchParams.get("type")    ?? undefined;
  const quality  = searchParams.get("quality") ?? undefined;

  const result = await getAdminItems({ page, pageSize, name, type, quality });
  return NextResponse.json(result);
}
