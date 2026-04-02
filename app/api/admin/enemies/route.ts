import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { enemies } from "@/lib/db/schema";
import { ilike } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const name = request.nextUrl.searchParams.get("name");
  const where = name ? ilike(enemies.name, `%${name}%`) : undefined;

  const data = await db
    .select({ id: enemies.id, name: enemies.name, level: enemies.level, zoneId: enemies.zoneId })
    .from(enemies)
    .where(where)
    .orderBy(enemies.name)
    .limit(50);

  return NextResponse.json({ data });
}
