import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createTrackedPriceItem,
  getTrackedPriceItems,
} from "@/lib/services/price-tracker.service";
import {
  invalidRequest,
  parsePositiveIntegerField,
  parseStringField,
  readJsonObject,
} from "@/lib/validation/api";

/**
 * GET /api/investments
 *
 * Returns all price-tracked items for the authenticated user.
 * Docs: docs/api/internal/investments.md
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await getTrackedPriceItems(session.user.id);

  return NextResponse.json({ items });
}

/**
 * POST /api/investments
 *
 * Adds an item to the authenticated user's price tracker.
 * Body: { itemHashedId, itemName, itemQuality, itemType, imageUrl?, tier? }
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body.ok) return invalidRequest(body.message);

  const itemHashedId = parseStringField(body.data, "itemHashedId", { required: true });
  if (!itemHashedId.ok) return invalidRequest(itemHashedId.message);

  const itemName = parseStringField(body.data, "itemName", { required: true });
  if (!itemName.ok) return invalidRequest(itemName.message);

  const itemQuality = parseStringField(body.data, "itemQuality", { required: true });
  if (!itemQuality.ok) return invalidRequest(itemQuality.message);

  const itemType = parseStringField(body.data, "itemType", { required: true });
  if (!itemType.ok) return invalidRequest(itemType.message);

  const imageUrl = parseStringField(body.data, "imageUrl");
  if (!imageUrl.ok) return invalidRequest(imageUrl.message);

  const tier = parsePositiveIntegerField(body.data, "tier");
  if (!tier.ok) return invalidRequest(tier.message);
  if (
    itemHashedId.data === undefined ||
    itemName.data === undefined ||
    itemQuality.data === undefined ||
    itemType.data === undefined
  ) {
    return invalidRequest("Missing required fields");
  }

  const item = await createTrackedPriceItem({
    userId: session.user.id,
    itemHashedId: itemHashedId.data,
    itemName: itemName.data,
    itemQuality: itemQuality.data,
    itemType: itemType.data,
    imageUrl: imageUrl.data ?? null,
    tier: tier.data ?? 1,
  });

  return NextResponse.json({ item });
}
