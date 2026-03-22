import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

/**
 * GET /api/market/item/[id]
 *
 * Returns full DB-backed item data including inspect fields (stats, recipe,
 * effects, requirements) so the detail panel can be served entirely from the DB.
 *
 * Response: { item: FullItem | null }
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
      description:   items.description,
      isTradeable:   items.isTradeable,
      maxTier:       items.maxTier,
      requirements:  items.requirements,
      baseStats:     items.baseStats,
      tierModifiers: items.tierModifiers,
      effects:       items.effects,
      recipe:        items.recipe,
    })
    .from(items)
    .where(eq(items.hashedId, id))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ item: null });

  const r = rows[0];
  return NextResponse.json({
    item: {
      hashed_id:       r.hashedId,
      name:            r.name,
      type:            r.type,
      quality:         r.quality,
      image_url:       r.imageUrl,
      vendor_price:    r.vendorPrice,
      last_sold_price: r.lastSoldPrice,
      last_sold_at:    r.lastSoldAt?.toISOString() ?? null,
      description:     r.description,
      is_tradeable:    r.isTradeable,
      max_tier:        r.maxTier,
      requirements:    r.requirements,
      base_stats:      r.baseStats,
      tier_modifiers:  r.tierModifiers,
      effects:         r.effects,
      recipe:          r.recipe,
    },
  });
}
