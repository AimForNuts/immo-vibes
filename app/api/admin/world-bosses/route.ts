import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { worldBosses } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const name = request.nextUrl.searchParams.get("name");
  const where = name ? ilike(worldBosses.name, `%${name}%`) : undefined;

  const data = await db
    .select({ id: worldBosses.id, name: worldBosses.name, level: worldBosses.level, zoneId: worldBosses.zoneId })
    .from(worldBosses)
    .where(where)
    .orderBy(worldBosses.name)
    .limit(50);

  return NextResponse.json({ data });
}
