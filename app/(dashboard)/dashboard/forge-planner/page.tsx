import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, type ItemRecipe } from "@/lib/db/schema";
import { ForgePlanner } from "./ForgePlanner";
import type { ForgeRecipeItem } from "./types";

export default async function ForgePlannerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const rows = await db
    .select({
      hashedId: items.hashedId,
      name: items.name,
      quality: items.quality,
      imageUrl: items.imageUrl,
      recipe: items.recipe,
    })
    .from(items)
    .where(eq(sql<string>`${items.recipe}->>'skill'`, "Forge"))
    .orderBy(asc(items.name));

  const recipeRows = rows.filter(
    (row): row is typeof row & { recipe: ItemRecipe } => Boolean(row.recipe?.materials?.length),
  );

  const resultHashedIds = Array.from(
    new Set(
      recipeRows
        .map((row) => row.recipe.result?.hashed_item_id)
        .filter((hashedId): hashedId is string => Boolean(hashedId)),
    ),
  );

  const resultRows = resultHashedIds.length > 0
    ? await db
        .select({
          hashedId: items.hashedId,
          name: items.name,
          quality: items.quality,
          imageUrl: items.imageUrl,
        })
        .from(items)
        .where(inArray(items.hashedId, resultHashedIds))
    : [];

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
