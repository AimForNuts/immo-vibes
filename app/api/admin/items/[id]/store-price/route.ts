import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>)?.store_price;
  if (raw !== null && (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0)) {
    return NextResponse.json(
      { error: "store_price must be a number >= 0 or null" },
      { status: 400 }
    );
  }
  const storePrice: number | null = raw === null ? null : (raw as number);

  const { id } = await params;

  const updated = await db
    .update(items)
    .set({ storePrice })
    .where(eq(items.hashedId, id))
    .returning({ storePrice: items.storePrice });

  if (updated.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ store_price: updated[0].storePrice });
}
