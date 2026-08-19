import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { findRecipeForResult } from "@/lib/services/items.service";

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

  const recipe = await findRecipeForResult(id);
  if (!recipe) return NextResponse.json({ recipe: null });

  return NextResponse.json({
    recipe: { hashed_id: recipe.hashedId, name: recipe.name },
  });
}
