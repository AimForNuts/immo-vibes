import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const BASE = "https://api.idle-mmo.com";

const CANDIDATE_PATHS = [
  "/v1/combat/dungeons/list",
];

async function probe(path: string, token: string) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": "ImmoWebSuite/1.0" },
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    return {
      path,
      status: res.status,
      topLevelType: Array.isArray(body) ? "array" : typeof body,
      topLevelKeys: body && !Array.isArray(body) && typeof body === "object" ? Object.keys(body as object) : null,
      firstItem: Array.isArray(body) ? (body as unknown[])[0] : null,
    };
  } catch (e) {
    return { path, error: String(e) };
  }
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token configured" }, { status: 400 });

  const results = await Promise.all(CANDIDATE_PATHS.map((p) => probe(p, token)));

  return NextResponse.json({ results });
}
