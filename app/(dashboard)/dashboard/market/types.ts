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
}

/** Full item from GET /api/market/item/[id] — includes inspect fields. */
export interface FullItem extends DbItem {
  description:    string | null;
  is_tradeable:   boolean | null;
  max_tier:       number | null;
  requirements:   Record<string, number> | null;
  base_stats:     Record<string, number> | null;
  tier_modifiers: Record<string, number> | null;
  effects:        ItemEffect[] | null;
  recipe:         ItemRecipe | null;
}

export interface MarketPrice {
  price:    number | null;
  sold_at:  string | null;
  quantity: number | null;
}

export interface Filters {
  rarities:  Set<string>;
  types:     Set<string>;
  vendorMin: string;
  vendorMax: string;
  marketMin: string;
  marketMax: string;
}

export const DEFAULT_FILTERS: Filters = {
  rarities:  new Set(),
  types:     new Set(),
  vendorMin: "",
  vendorMax: "",
  marketMin: "",
  marketMax: "",
};
