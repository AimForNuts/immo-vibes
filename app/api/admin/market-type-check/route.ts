import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MARKET_TABS } from "@/lib/market-config";

const BASE = "https://api.idle-mmo.com";

/**
 * GET /api/admin/market-type-check
 *
 * Admin-only. Tests every item type across all market tabs and reports how many
 * items page 1 returns from the IdleMMO API. Use this to identify types that
 * return 0 results (wrong name, not tradeable, or no market listings).
 *
 * Response: Array of { tab, type, count, total_pages } sorted by tab then type.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.user.idlemmoToken;
  if (!token) return NextResponse.json({ error: "No API token" }, { status: 400 });

  const results: Array<{
    tab:         string;
    type:        string;
    count:       number;
    total_pages: number;
    error?:      string;
  }> = [];

  for (const tab of MARKET_TABS) {
    if (tab.types.length === 0) continue; // skip "All" tab

    for (const type of tab.types) {
      try {
        const res = await fetch(
          `${BASE}/v1/item/search?type=${encodeURIComponent(type)}&page=1`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "ImmoWebSuite/1.0",
            },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          results.push({ tab: tab.id, type, count: 0, total_pages: 0, error: `HTTP ${res.status}` });
          continue;
        }

        const data = await res.json();
        results.push({
          tab:         tab.id,
          type,
          count:       data.items?.length ?? 0,
          total_pages: data.pagination?.last_page ?? 1,
        });
      } catch (e) {
        results.push({ tab: tab.id, type, count: 0, total_pages: 0, error: String(e) });
      }

      // Small delay to avoid hammering the API
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return NextResponse.json({ results });
}
