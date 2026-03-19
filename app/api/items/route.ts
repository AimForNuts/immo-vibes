import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();
  const q = searchParams.get("q")?.trim();
  const quality = searchParams.get("quality")?.toUpperCase();

  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  const filters = [
    eq(items.type, type),
    ...(q ? [ilike(items.name, `%${q}%`)] : []),
    ...(quality ? [eq(items.quality, quality)] : []),
  ];

  const rows = await db
    .select()
    .from(items)
    .where(and(...filters))
    .orderBy(items.name)
    .limit(30);

  return NextResponse.json({ items: rows });
}
