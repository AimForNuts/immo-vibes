import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { marketPriceHistory } from "@/lib/db/schema";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/market/price/[id]?tier=0
 *
 * Returns the latest sold price for an item from the IdleMMO market-history endpoint.
 * Also persists each unique (item, soldAt) record to market_price_history so we
 * accumulate history the game would eventually discard.
 *
 * Response: { price: number | null, sold_at: string | null, quantity: number | null }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const { id } = await params;
  const tier = new URL(request.url).searchParams.get("tier") ?? "0";

  try {
    const res = await fetch(
      `${BASE}/v1/item/${id}/market-history?tier=${tier}&type=listings`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "ImmoWebSuite/1.0",
        },
        next: { revalidate: 30 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ price: null, sold_at: null, quantity: null });
    }

    const data = await res.json();
    const latest = Array.isArray(data.latest_sold) && data.latest_sold.length > 0
      ? data.latest_sold[0]
      : null;

    // Persist to price history — we accumulate records the game would eventually discard
    if (latest?.price_per_item != null && latest?.sold_at != null) {
      try {
        await db.insert(marketPriceHistory).values({
          id:           randomUUID(),
          itemHashedId: id,
          price:        latest.price_per_item,
          quantity:     latest.quantity ?? 1,
          soldAt:       new Date(latest.sold_at),
          recordedAt:   new Date(),
        }).onConflictDoNothing();
      } catch {
        // DB persistence is best-effort — never block the price response
      }
    }

    return NextResponse.json({
      price:    latest?.price_per_item ?? null,
      sold_at:  latest?.sold_at       ?? null,
      quantity: latest?.quantity      ?? null,
    });
  } catch {
    return NextResponse.json({ price: null, sold_at: null, quantity: null });
  }
}
