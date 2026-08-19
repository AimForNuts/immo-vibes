import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MARKET_TABS } from "@/lib/market-config";
import { getMarketItems } from "@/lib/services/items.service";

const PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const tabId = searchParams.get("tab") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const dateRange = searchParams.get("dateRange") ?? "latest";
  const recipeSkill = searchParams.get("recipeSkill")?.trim() ?? "";
  const tab = MARKET_TABS.find((t) => t.id === tabId);
  const isCategoryTab = tab !== undefined && tab.types.length > 0;

  if (!query && tabId !== "recently_added" && !isCategoryTab) {
    return NextResponse.json({ error: "query or a category tab is required" }, { status: 400 });
  }

  const result = await getMarketItems({
    query,
    tabId,
    page,
    pageSize: PAGE_SIZE,
    dateRange,
    recipeSkill,
  });

  const lastPage = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return NextResponse.json({
    items: result.data.map((item) => ({
      hashed_id: item.hashedId,
      name: item.name,
      type: item.type,
      quality: item.quality,
      image_url: item.imageUrl,
      vendor_price: item.vendorPrice ?? null,
      last_sold_price: item.lastSoldPrice ?? null,
      last_sold_at: item.lastSoldAt ? item.lastSoldAt.toISOString() : null,
      is_tradeable: item.isTradeable ?? null,
      recipe_skill: item.recipeSkill ?? null,
      store_price: item.storePrice ?? null,
    })),
    pagination: { current_page: page, last_page: lastPage, total: result.total },
  });
}
