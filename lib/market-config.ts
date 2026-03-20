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
   * Empty array = "All" tab, which uses name-based search instead.
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
    types: ["POTION"],
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
    types: ["BAIT", "BLANK_SCROLL", "EMPTY_CRYSTAL", "ESSENCE_CRYSTAL", "METAMORPHITE", "NAMESTONE", "SKIN", "VIAL"],
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
];
