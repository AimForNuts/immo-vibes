import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getForgeRecipeItems, getItemsByIds } from "@/lib/services/items.service";
import { ForgePlanner } from "./ForgePlanner";
import type { ForgeRecipeItem } from "./types";

export default async function ForgePlannerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const recipeRows = await getForgeRecipeItems();

  const resultHashedIds = Array.from(
    new Set(
      recipeRows
        .map((row) => row.recipe.result?.hashed_item_id)
        .filter((hashedId): hashedId is string => Boolean(hashedId)),
    ),
  );

  const resultRows = await getItemsByIds(resultHashedIds);

  const resultsById = new Map(resultRows.map((row) => [row.hashedId, row]));

  const forgeRecipes: ForgeRecipeItem[] = recipeRows.map((row) => {
    const result = row.recipe.result ? resultsById.get(row.recipe.result.hashed_item_id) : null;

    return {
      hashedId: row.hashedId,
      name: row.name,
      quality: row.quality,
      imageUrl: row.imageUrl,
      resultName: result?.name ?? row.recipe.result?.item_name ?? row.name,
      resultQuality: result?.quality ?? row.quality,
      resultImageUrl: result?.imageUrl ?? row.imageUrl,
      recipe: row.recipe,
    };
  });

  return <ForgePlanner recipes={forgeRecipes} />;
}
