import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/market
 *
 * Single-page item search proxy to the IdleMMO API.
 * Use `type` for category browsing, `query` for name search.
 *
 * Docs: docs/api/internal/market.md
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const type  = searchParams.get("type");
  const query = searchParams.get("query");
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  if (!type && !query) {
    return NextResponse.json({ error: "type or query is required" }, { status: 400 });
  }

  const qs = type
    ? `type=${encodeURIComponent(type.toUpperCase())}&page=${page}`
    : `query=${encodeURIComponent(query!)}&page=${page}`;

  try {
    const res = await fetch(`${BASE}/v1/item/search?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "ImmoWebSuite/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `IdleMMO API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      items: data.items ?? [],
      pagination: data.pagination ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
