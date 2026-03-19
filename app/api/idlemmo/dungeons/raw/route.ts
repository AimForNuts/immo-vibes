import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

/**
 * Debug endpoint — returns the raw IdleMMO /v1/dungeon response without parsing.
 * Navigate to /api/idlemmo/dungeons/raw in the browser to inspect the actual structure.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 400 });

  const url = `${BASE}/v1/dungeon`;
  let status: number;
  let raw: unknown;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "ImmoWebSuite/1.0",
      },
      cache: "no-store",
    });
    status = res.status;
    raw = await res.json().catch(() => null);
  } catch (e) {
    return NextResponse.json({ error: "Fetch failed", detail: String(e) }, { status: 502 });
  }

  return NextResponse.json({
    _debug: {
      url,
      httpStatus: status!,
      topLevelType: Array.isArray(raw) ? "array" : typeof raw,
      topLevelKeys: raw && !Array.isArray(raw) && typeof raw === "object" ? Object.keys(raw as object) : null,
      firstItem: Array.isArray(raw) ? (raw as unknown[])[0] : null,
      dataFirstItem: !Array.isArray(raw) && typeof raw === "object" && raw !== null && Array.isArray((raw as Record<string, unknown>).data)
        ? ((raw as Record<string, unknown>).data as unknown[])[0]
        : null,
      totalItems: Array.isArray(raw)
        ? (raw as unknown[]).length
        : !Array.isArray(raw) && typeof raw === "object" && raw !== null
          ? Object.fromEntries(
              Object.entries(raw as Record<string, unknown>)
                .filter(([, v]) => Array.isArray(v))
                .map(([k, v]) => [k, (v as unknown[]).length])
            )
          : null,
    },
    raw,
  });
}
