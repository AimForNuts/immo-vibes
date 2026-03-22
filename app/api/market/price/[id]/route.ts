import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

/**
 * GET /api/market/price/[id]
 *
 * Returns the latest sold price for an item from the local DB (items.last_sold_price).
 * The `tier` query param is accepted but ignored — prices are stored per item, not per tier.
 *
 * Response: { price: number | null, sold_at: string | null, quantity: number | null }
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select({
      lastSoldPrice: items.lastSoldPrice,
      lastSoldAt:    items.lastSoldAt,
    })
    .from(items)
    .where(eq(items.hashedId, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ price: null, sold_at: null, quantity: null });
  }

  const row = rows[0];
  return NextResponse.json({
    price:    row.lastSoldPrice ?? null,
    sold_at:  row.lastSoldAt?.toISOString() ?? null,
    quantity: null,
  });
}
