interface RecipeWithMaterials {
  hashedId: string;
  recipe: {
    materials: Array<{
      hashed_item_id: string;
      item_name: string;
      quantity: number;
    }>;
  };
}

interface MaterialSelection {
  recipeHashedId: string;
  quantity: number;
}

interface MaterialTotal {
  hashedItemId: string;
  itemName: string;
  quantity: number;
}

export function calculateForgeMaterials(
  recipes: RecipeWithMaterials[],
  selections: MaterialSelection[],
): MaterialTotal[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.hashedId, recipe]));
  const totals = new Map<string, MaterialTotal>();

  for (const selection of selections) {
    const quantity = Math.max(0, Math.floor(selection.quantity));
    if (quantity === 0) continue;

    const recipe = recipesById.get(selection.recipeHashedId);
    if (!recipe) continue;

    for (const material of recipe.recipe.materials) {
      const current = totals.get(material.hashed_item_id);
      const materialQuantity = material.quantity * quantity;

      if (current) {
        current.quantity += materialQuantity;
      } else {
        totals.set(material.hashed_item_id, {
          hashedItemId: material.hashed_item_id,
          itemName: material.item_name,
          quantity: materialQuantity,
        });
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
}
