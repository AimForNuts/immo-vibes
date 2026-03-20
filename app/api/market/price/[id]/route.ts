import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/market/price/[id]?tier=0
 *
 * Returns the latest sold price for an item from the IdleMMO market-history endpoint.
 * Used to show market prices on item cards in the Market Browser.
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

    return NextResponse.json({
      price:    latest?.price_per_item ?? null,
      sold_at:  latest?.sold_at       ?? null,
      quantity: latest?.quantity      ?? null,
    });
  } catch {
    return NextResponse.json({ price: null, sold_at: null, quantity: null });
  }
}
