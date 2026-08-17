import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteTrackedPriceItem } from "@/lib/services/price-tracker.service";

/**
 * DELETE /api/investments/[id]
 *
 * Removes a tracked item. Only succeeds if the item belongs to the session user.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await deleteTrackedPriceItem({ id, userId: session.user.id });

  return NextResponse.json({ ok: true });
}
