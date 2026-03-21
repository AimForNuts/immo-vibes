import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";

/**
 * GET /api/market/crafted-by/[id]
 *
 * Finds the RECIPE item whose recipe_result_hashed_id matches the given item id.
 * Used to show "Crafted By" info when viewing a non-recipe item in the market.
 *
 * Response: { recipe: { hashed_id, name } | null }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const rows = await db
    .select({ hashedId: items.hashedId, name: items.name })
    .from(items)
    .where(eq(items.recipeResultHashedId, id))
    .limit(1);

  if (rows.length === 0) return NextResponse.json({ recipe: null });

  return NextResponse.json({
    recipe: { hashed_id: rows[0].hashedId, name: rows[0].name },
  });
}
