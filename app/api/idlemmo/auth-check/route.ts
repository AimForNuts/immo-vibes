import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/idlemmo/auth-check
 *
 * Proxies GET /v1/auth/check to return the user's API key rate limit.
 * Used by the client-side IdleMmoQueue to enforce the correct rate limit.
 *
 * Response: { rate_limit: number, expires_at: string | null }
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ rate_limit: 20, expires_at: null });

  try {
    const res = await fetch(`${BASE}/v1/auth/check`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "ImmoWebSuite/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) return NextResponse.json({ rate_limit: 20, expires_at: null });

    const data = await res.json();
    return NextResponse.json({
      rate_limit:  data.api_key?.rate_limit  ?? 20,
      expires_at:  data.api_key?.expires_at  ?? null,
    });
  } catch {
    return NextResponse.json({ rate_limit: 20, expires_at: null });
  }
}
