import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { forwardIdleMmoRateLimitHeaders, rateLimitedIdleMmoFetch } from "@/lib/idlemmo-rate-limit";

const BASE = "https://api.idle-mmo.com";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const { id } = await params;

  const idlemmoRes = await rateLimitedIdleMmoFetch(token, `${BASE}/v1/item/${id}/inspect`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "ImmoWebSuite/1.0",
    },
    cache: "no-store",
  });

  if (idlemmoRes.status === 429) {
    const response = NextResponse.json({ error: "Rate limited" }, { status: 429 });
    forwardIdleMmoRateLimitHeaders(idlemmoRes, response);
    return response;
  }

  if (!idlemmoRes.ok) {
    const status = idlemmoRes.status === 404 ? 404 : 500;
    const response = NextResponse.json(
      { error: `IdleMMO API returned ${idlemmoRes.status}` },
      { status }
    );
    forwardIdleMmoRateLimitHeaders(idlemmoRes, response);
    return response;
  }

  const data = await idlemmoRes.json();
  const response = NextResponse.json({ item: data.item ?? null });
  forwardIdleMmoRateLimitHeaders(idlemmoRes, response);
  return response;
}
