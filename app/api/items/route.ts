import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type")?.toUpperCase();
  const q = searchParams.get("q")?.trim();

  // type is required — each slot only shows its own item type
  if (!type) return NextResponse.json({ error: "type is required" }, { status: 400 });

  // For dual-dagger, type will be "DAGGER" for both slots — that's fine
  const typeFilter = eq(items.type, type);
  const nameFilter = q ? ilike(items.name, `%${q}%`) : undefined;

  const rows = await db
    .select()
    .from(items)
    .where(nameFilter ? and(typeFilter, nameFilter) : typeFilter)
    .orderBy(items.name)
    .limit(30);

  return NextResponse.json({ items: rows });
}
