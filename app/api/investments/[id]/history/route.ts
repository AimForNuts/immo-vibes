import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceTracker } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/investments/[id]/history
 *
 * Returns recent market listings for a tracked item.
 * Proxies to IdleMMO GET /v1/item/{hashedId}/market-history?tier={tier}&type=listings
 *
 * Docs: docs/api/internal/investments.md
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const { id } = await params;

  const [tracked] = await db
    .select()
    .from(priceTracker)
    .where(and(eq(priceTracker.id, id), eq(priceTracker.userId, session.user.id)));

  if (!tracked) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const res = await fetch(
      `${BASE}/v1/item/${tracked.itemHashedId}/market-history?tier=${tracked.tier - 1}&type=listings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "ImmoWebSuite/1.0",
        },
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `IdleMMO API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    // Normalise: IdleMMO returns { data: [...] } with price/quantity/created_at fields
    const history = (data.data ?? []).map((entry: { price: number; quantity: number; created_at: string }) => ({
      price: entry.price,
      quantity: entry.quantity,
      fetchedAt: entry.created_at,
    }));

    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
