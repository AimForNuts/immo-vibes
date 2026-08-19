CREATE TABLE IF NOT EXISTS items (
  hashed_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quality TEXT NOT NULL,
  image_url TEXT,
  synced_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  vendor_price INTEGER,
  store_price INTEGER,
  description TEXT,
  is_tradeable INTEGER,
  max_tier INTEGER,
  requirements TEXT,
  base_stats TEXT,
  tier_modifiers TEXT,
  effects TEXT,
  recipe TEXT,
  inspected_at TEXT,
  recipe_result_hashed_id TEXT,
  last_sold_price INTEGER,
  last_sold_at TEXT,
  price_checked_at TEXT
);

CREATE INDEX IF NOT EXISTS items_name_idx ON items (name);
CREATE INDEX IF NOT EXISTS items_type_idx ON items (type);
CREATE INDEX IF NOT EXISTS items_quality_idx ON items (quality);
CREATE INDEX IF NOT EXISTS items_first_seen_at_idx ON items (first_seen_at);
CREATE INDEX IF NOT EXISTS items_price_checked_at_idx ON items (price_checked_at);
CREATE INDEX IF NOT EXISTS items_recipe_result_hashed_id_idx ON items (recipe_result_hashed_id);
