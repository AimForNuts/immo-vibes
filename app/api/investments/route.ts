import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceTracker } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * GET /api/investments
 *
 * Returns all price-tracked items for the authenticated user.
 * Docs: docs/api/internal/investments.md
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db
    .select()
    .from(priceTracker)
    .where(eq(priceTracker.userId, session.user.id));

  return NextResponse.json({ items });
}

/**
 * POST /api/investments
 *
 * Adds an item to the authenticated user's price tracker.
 * Body: { itemHashedId, itemName, itemQuality, itemType, imageUrl?, tier? }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { itemHashedId, itemName, itemQuality, itemType, imageUrl, tier } = body;

  if (!itemHashedId || !itemName || !itemQuality || !itemType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [item] = await db
    .insert(priceTracker)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      itemHashedId,
      itemName,
      itemQuality,
      itemType,
      imageUrl: imageUrl ?? null,
      tier: tier ?? 1,
      createdAt: new Date(),
    })
    .returning();

  return NextResponse.json({ item });
}
