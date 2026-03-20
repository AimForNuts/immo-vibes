/**
 * Market browser tab definitions.
 *
 * Each tab maps to one or more IdleMMO item types.
 * The "all" tab uses name-based search rather than type filtering.
 *
 * To reorganise tabs: edit MARKET_TABS below.
 * Type → tab assignment is fully documented in docs/game-mechanics/item-types.md
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
    types: ["ORE", "LOG", "FISH", "METAL_BAR", "CRAFTING_MATERIAL", "CONSTRUCTION_MATERIAL", "GEMSTONE", "BAIT"],
  },
  {
    id:    "alchemy",
    label: "Alchemy & Recipes",
    types: ["POTION", "VIAL", "RECIPE", "BLANK_SCROLL", "GUIDANCE_SCROLL", "EMPTY_CRYSTAL", "ESSENCE_CRYSTAL", "FOOD", "CAKE"],
  },
  {
    id:    "gear",
    label: "Gear",
    types: ["SWORD", "DAGGER", "BOW", "SHIELD", "HELMET", "CHESTPLATE", "GREAVES", "GAUNTLETS", "BOOTS"],
  },
  {
    id:    "tools",
    label: "Tools",
    types: ["FELLING_AXE", "FISHING_ROD", "PICKAXE"],
  },
  {
    id:    "collectables",
    label: "Collectables",
    types: ["COLLECTABLE", "RELIC", "SKIN", "SPECIAL", "NAMESTONE", "PET_EGG", "METAMORPHITE", "UPGRADE_STONE", "TELEPORTATION_STONE", "MEMBERSHIP", "TOKEN", "CHEST", "CAMPAIGN_ITEM"],
  },
];
