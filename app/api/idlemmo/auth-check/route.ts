import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forwardIdleMmoRateLimitHeaders, rateLimitedIdleMmoFetch } from "@/lib/idlemmo-rate-limit";

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
    const res = await rateLimitedIdleMmoFetch(token, `${BASE}/v1/auth/check`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "ImmoWebSuite/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const response = NextResponse.json({ rate_limit: null, expires_at: null });
      forwardIdleMmoRateLimitHeaders(res, response);
      return response;
    }

    const data = await res.json();
    const response = NextResponse.json({
      rate_limit:  data.api_key?.rate_limit  ?? null,
      expires_at:  data.api_key?.expires_at  ?? null,
    });
    forwardIdleMmoRateLimitHeaders(res, response);
    return response;
  } catch {
    return NextResponse.json({ rate_limit: null, expires_at: null });
  }
}
