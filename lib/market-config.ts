/**
 * Market browser tab definitions.
 *
 * Each tab maps to one or more IdleMMO item types.
 * The "all" tab uses name-based search rather than type filtering.
 *
 * Canonical tab → type assignments are documented in docs/game-mechanics/item-types.md
 * Tabs with `showsRecipes: true` receive recipe data in the detail panel (alchemy/gear/tools).
 */

export interface MarketTab {
  /** Unique identifier used in URL state and component logic. */
  id: string;
  /** Display label shown in the tab bar. */
  label: string;
  /**
   * IdleMMO item types included in this tab.
   * Empty array = special tab: `"all"` uses name-based search; `"recently_added"` uses the dateRange API mode.
   */
  types: string[];
}

export const MARKET_TABS: MarketTab[] = [
  {
    id:    "all",
    label: "All",
    types: [],
  },
  {
    id:    "resources",
    label: "Resources",
    types: [
      "CAKE", "CAMPAIGN_ITEM", "CHEST", "CONSTRUCTION_MATERIAL", "CRAFTING_MATERIAL",
      "FISH", "FOOD", "GUIDANCE_SCROLL", "LOG", "MEMBERSHIP", "METAL_BAR",
      "ORE", "PET_EGG", "RELIC", "TELEPORTATION_STONE", "TOKEN", "UPGRADE_STONE",
    ],
  },
  {
    id:    "alchemy",
    label: "Alchemy",
    types: ["POTION", "ESSENCE_CRYSTAL"],
  },
  {
    id:    "gear",
    label: "Gear",
    types: ["BOOTS", "BOW", "CHESTPLATE", "DAGGER", "GAUNTLETS", "GREAVES", "HELMET", "SHIELD", "SWORD"],
  },
  {
    id:    "tools",
    label: "Tools",
    types: ["FELLING_AXE", "FISHING_ROD", "PICKAXE"],
  },
  {
    id:    "collectables",
    label: "Collectables",
    types: ["COLLECTABLE"],
  },
  {
    id:    "merchants",
    label: "Merchants",
    types: ["BAIT", "BLANK_SCROLL", "EMPTY_CRYSTAL", "METAMORPHITE", "NAMESTONE", "SKIN", "VIAL"],
  },
  {
    id:    "event",
    label: "Event",
    types: ["SPECIAL"],
  },
  {
    id:    "recipes",
    label: "Recipes",
    types: ["RECIPE"],
  },
  {
    id:    "legacy",
    label: "Legacy",
    types: ["GEMSTONE"],
  },
  {
    id:    "recently_added",
    label: "Recently Added",
    types: [],
  },
];

/**
 * Category grouping for the Resources tab.
 * Each category maps to a set of IdleMMO item types.
 * Order determines display order in the UI.
 */
export const RESOURCE_CATEGORIES: Array<{ label: string; types: string[] }> = [
  { label: "Gathering",   types: ["LOG", "FISH", "ORE", "METAL_BAR"] },
  { label: "Food",        types: ["FOOD"] },
  { label: "Consumables", types: ["CAKE", "GUIDANCE_SCROLL", "TELEPORTATION_STONE", "UPGRADE_STONE", "MEMBERSHIP"] },
  { label: "Crafting",    types: ["CRAFTING_MATERIAL", "CONSTRUCTION_MATERIAL"] },
  { label: "Pet Eggs",    types: ["PET_EGG"] },
  { label: "Other",       types: ["RELIC", "CHEST", "TOKEN"] },
];

/**
 * Display label for each item type on the Merchants tab.
 * Used to group Merchants items by type instead of quality.
 */
export const MERCHANT_TYPE_LABELS: Record<string, string> = {
  BAIT:          "Bait",
  BLANK_SCROLL:  "Scrolls",
  EMPTY_CRYSTAL: "Crystals",
  METAMORPHITE:  "Upgrade Materials",
  NAMESTONE:     "Name Stones",
  SKIN:          "Skins",
  VIAL:          "Vials",
};
