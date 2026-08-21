import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getTrackedPriceItem } from "@/lib/services/price-tracker.service";
import { listMarketPriceHistory } from "@/lib/services/market-price-history.service";

/**
 * GET /api/investments/[id]/history
 *
 * Returns recent locally recorded market listings for a tracked item.
 *
 * Docs: docs/api/internal/investments.md
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tracked = await getTrackedPriceItem({ id, userId: session.user.id });

  if (!tracked) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const history = await listMarketPriceHistory({
      itemHashedId: tracked.itemHashedId,
      tier: tracked.tier,
      limit: 90,
    });

    return NextResponse.json({ history });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
