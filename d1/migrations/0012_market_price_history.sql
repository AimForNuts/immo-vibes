CREATE TABLE IF NOT EXISTS market_price_history (
  id TEXT PRIMARY KEY NOT NULL,
  item_hashed_id TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  sold_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS market_price_history_uniq
  ON market_price_history (item_hashed_id, tier, sold_at);

CREATE INDEX IF NOT EXISTS market_price_history_item_tier_sold_idx
  ON market_price_history (item_hashed_id, tier, sold_at);
