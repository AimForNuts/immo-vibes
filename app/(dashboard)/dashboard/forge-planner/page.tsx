import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
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

  const forgeRecipes: ForgeRecipeItem[] = rows
    .filter((row): row is typeof row & { recipe: ItemRecipe } => Boolean(row.recipe?.materials?.length))
    .map((row) => ({
      hashedId: row.hashedId,
      name: row.name,
      quality: row.quality,
      imageUrl: row.imageUrl,
      recipe: row.recipe,
    }));

  return <ForgePlanner recipes={forgeRecipes} />;
}
