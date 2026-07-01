import { describe, expect, it } from "vitest";
import { calculateForgeMaterials } from "@/lib/domain/forge-planner";

describe("calculateForgeMaterials", () => {
  it("multiplies selected recipe quantities and combines shared materials", () => {
    const recipes = [
      {
        hashedId: "whisperwind-recipe",
        recipe: {
          materials: [
            { hashed_item_id: "oak-log", item_name: "Oak log", quantity: 300 },
            { hashed_item_id: "yew-log", item_name: "Yew log", quantity: 250 },
            { hashed_item_id: "rabbit-foot", item_name: "Lucky Rabbit Foot", quantity: 20 },
          ],
        },
      },
      {
        hashedId: "stormcaster-recipe",
        recipe: {
          materials: [
            { hashed_item_id: "yew-log", item_name: "Yew log", quantity: 150 },
            { hashed_item_id: "duck-mouth", item_name: "Ducks Mouth", quantity: 20 },
            { hashed_item_id: "boar-tusk", item_name: "Boar Tusk", quantity: 5 },
          ],
        },
      },
    ];

    expect(calculateForgeMaterials(recipes, [
      { recipeHashedId: "whisperwind-recipe", quantity: 2 },
      { recipeHashedId: "stormcaster-recipe", quantity: 1 },
    ])).toEqual([
      { hashedItemId: "boar-tusk", itemName: "Boar Tusk", quantity: 5 },
      { hashedItemId: "duck-mouth", itemName: "Ducks Mouth", quantity: 20 },
      { hashedItemId: "rabbit-foot", itemName: "Lucky Rabbit Foot", quantity: 40 },
      { hashedItemId: "oak-log", itemName: "Oak log", quantity: 600 },
      { hashedItemId: "yew-log", itemName: "Yew log", quantity: 650 },
    ]);
  });

  it("ignores missing recipes and non-positive quantities", () => {
    const recipes = [
      {
        hashedId: "recipe",
        recipe: {
          materials: [{ hashed_item_id: "oak-log", item_name: "Oak log", quantity: 300 }],
        },
      },
    ];

    expect(calculateForgeMaterials(recipes, [
      { recipeHashedId: "missing", quantity: 2 },
      { recipeHashedId: "recipe", quantity: 0 },
    ])).toEqual([]);
  });
});
