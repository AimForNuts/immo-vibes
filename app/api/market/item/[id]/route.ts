import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

/**
 * GET /api/market/item/[id]
 *
 * Returns DB-backed item data (prices, name, quality, image) for a single item.
 * Used to show vendor/market values of a produced item when viewing a RECIPE,
 * and to enrich "crafted by" display for non-recipe items.
 *
 * Response: { item: { hashed_id, name, type, quality, image_url, vendor_price,
 *                     last_sold_price, last_sold_at } | null }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select({
      hashedId:      items.hashedId,
      name:          items.name,
      type:          items.type,
      quality:       items.quality,
      imageUrl:      items.imageUrl,
      vendorPrice:   items.vendorPrice,
      lastSoldPrice: items.lastSoldPrice,
      lastSoldAt:    items.lastSoldAt,
    })
    .from(items)
    .where(eq(items.hashedId, id))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ item: null });

  const row = rows[0];
  return NextResponse.json({
    item: {
      hashed_id:       row.hashedId,
      name:            row.name,
      type:            row.type,
      quality:         row.quality,
      image_url:       row.imageUrl,
      vendor_price:    row.vendorPrice,
      last_sold_price: row.lastSoldPrice,
      last_sold_at:    row.lastSoldAt?.toISOString() ?? null,
    },
  });
}
