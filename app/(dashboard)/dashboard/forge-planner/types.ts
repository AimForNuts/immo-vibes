import type { ItemRecipe } from "@/lib/db/schema";

export interface ForgeRecipeItem {
  hashedId: string;
  name: string;
  quality: string;
  imageUrl: string | null;
  recipe: ItemRecipe;
}

export interface ForgePlanSelection {
  recipeHashedId: string;
  quantity: number;
}

export interface ForgeMaterialTotal {
  hashedItemId: string;
  itemName: string;
  quantity: number;
}
