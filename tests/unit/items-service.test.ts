import { beforeEach, describe, expect, it, vi } from "vitest";

const all = vi.fn();
const bind = vi.fn(() => ({ all }));
const prepare = vi.fn(() => ({ all, bind }));

vi.mock("@/lib/db/d1", () => ({
  getD1: () => ({ prepare }),
}));

describe("items service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("batches item id lookups to stay under D1 bound parameter limits", async () => {
    all
      .mockResolvedValueOnce({
        results: [
          { hashed_id: "item-1", name: "Item 1", quality: "STANDARD", image_url: null },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          { hashed_id: "item-101", name: "Item 101", quality: "EPIC", image_url: "https://example.test/item.png" },
        ],
      });

    const { getItemsByIds } = await import("@/lib/services/items.service");
    const items = await getItemsByIds(Array.from({ length: 101 }, (_, index) => `item-${index + 1}`));

    expect(prepare).toHaveBeenCalledTimes(2);
    expect(bind).toHaveBeenNthCalledWith(1, ...Array.from({ length: 100 }, (_, index) => `item-${index + 1}`));
    expect(bind).toHaveBeenNthCalledWith(2, "item-101");
    expect(items).toEqual([
      { hashedId: "item-1", name: "Item 1", quality: "STANDARD", imageUrl: null },
      { hashedId: "item-101", name: "Item 101", quality: "EPIC", imageUrl: "https://example.test/item.png" },
    ]);
  });

  it("queries forge recipes without letting malformed recipe JSON crash D1", async () => {
    all.mockResolvedValueOnce({
      results: [
        {
          hashed_id: "recipe-1",
          name: "Forge recipe",
          quality: "EPIC",
          image_url: null,
          recipe: JSON.stringify({
            skill: "Forge",
            level_required: 20,
            max_uses: 1,
            materials: [{ hashed_item_id: "bar-1", item_name: "Metal Bar", quantity: 4 }],
            result: { hashed_item_id: "sword-1", item_name: "Sword" },
          }),
        },
        {
          hashed_id: "recipe-empty",
          name: "Empty recipe",
          quality: "STANDARD",
          image_url: null,
          recipe: JSON.stringify({
            skill: "Forge",
            level_required: 1,
            max_uses: 1,
            materials: [],
            result: null,
          }),
        },
      ],
    });

    const { getForgeRecipeItems } = await import("@/lib/services/items.service");
    const recipes = await getForgeRecipeItems();

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("json_valid(recipe)"));
    expect(recipes).toEqual([
      {
        hashedId: "recipe-1",
        name: "Forge recipe",
        quality: "EPIC",
        imageUrl: null,
        recipe: {
          skill: "Forge",
          level_required: 20,
          max_uses: 1,
          materials: [{ hashed_item_id: "bar-1", item_name: "Metal Bar", quantity: 4 }],
          result: { hashed_item_id: "sword-1", item_name: "Sword" },
        },
      },
    ]);
  });
});
