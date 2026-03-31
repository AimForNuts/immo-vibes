import type { ItemEffect, ItemRecipe } from "@/lib/db/schema";

/** Item shape returned by the DB-backed GET /api/market route. */
export interface DbItem {
  hashed_id:       string;
  name:            string;
  type:            string;
  quality:         string;
  image_url:       string | null;
  vendor_price:    number | null;
  last_sold_price: number | null;
  last_sold_at:    string | null;
  is_tradeable:    boolean | null;
  /** Populated by /api/market route (Task 5). RECIPE-type items only; null otherwise. */
  recipe_skill:    string | null;
  /** Populated by /api/market route (Task 5). NPC merchant buy price; null until admin sets it. */
  store_price:     number | null;
}

/** Full item from GET /api/market/item/[id] — includes inspect fields. */
export interface FullItem extends DbItem {
  description:    string | null;
  max_tier:       number | null;
  requirements:   Record<string, number> | null;
  base_stats:     Record<string, number> | null;
  tier_modifiers: Record<string, number> | null;
  effects:        ItemEffect[] | null;
  recipe:         ItemRecipe | null;
  // where_to_find removed — location data lives in the zones table
}

/** Single zone entry returned by GET /api/market/zones. */
export interface ZoneResult {
  id:             number;
  name:           string;
  level_required: number;
  /** Enemies in this zone that drop the queried item. */
  enemies?:       Array<{ name: string; level: number }>;
  /** The gathering skill type. Present when item is gatherable here. */
  skill?:         "woodcutting" | "fishing" | "mining";
  /** Dungeons in this zone that yield the queried item. */
  dungeons?:      Array<{ name: string }>;
  /** World bosses in this zone that yield the queried item. */
  world_bosses?:  Array<{ name: string }>;
}

export interface MarketPrice {
  price:    number | null;
  sold_at:  string | null;
  quantity: number | null;
}

export interface Filters {
  tradeable: "all" | "tradeable";
  rarities:  Set<string>;
  types:     Set<string>;
  vendorMin: string;
  vendorMax: string;
  marketMin: string;
  marketMax: string;
}

export const DEFAULT_FILTERS: Filters = {
  tradeable: "tradeable",  // default: show tradeable items only
  rarities:  new Set(),
  types:     new Set(),
  vendorMin: "",
  vendorMax: "",
  marketMin: "",
  marketMax: "",
};
