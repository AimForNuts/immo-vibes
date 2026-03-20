import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceTracker } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

  await db
    .delete(priceTracker)
    .where(and(eq(priceTracker.id, id), eq(priceTracker.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
