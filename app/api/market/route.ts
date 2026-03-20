import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

function forwardRateLimitHeaders(from: Response, to: NextResponse) {
  const remaining = from.headers.get("x-ratelimit-remaining");
  const reset     = from.headers.get("x-ratelimit-reset");
  if (remaining !== null) to.headers.set("X-RateLimit-Remaining", remaining);
  if (reset     !== null) to.headers.set("X-RateLimit-Reset",     reset);
}

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

  const reqHeaders = {
    Authorization: `Bearer ${token}`,
    "User-Agent": "ImmoWebSuite/1.0",
  };

  try {
    // No server-side cache — market listings change continuously and the Next.js
    // data cache is keyed by URL only (ignoring the Authorization header), so a
    // stale cached response from any user's token would be served to all others.
    let res = await fetch(`${BASE}/v1/item/search?${qs}`, {
      headers: reqHeaders,
      cache: "no-store",
    });

    // Single retry after a short wait if rate-limited
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 3_000));
      res = await fetch(`${BASE}/v1/item/search?${qs}`, {
        headers: reqHeaders,
        cache: "no-store",
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `IdleMMO API returned ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const response = NextResponse.json({
      items: data.items ?? [],
      pagination: data.pagination ?? null,
    });
    forwardRateLimitHeaders(res, response);
    return response;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
