CREATE TABLE IF NOT EXISTS dungeons (
  id INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  zone_id INTEGER,
  level_required INTEGER NOT NULL DEFAULT 0,
  difficulty INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  gold_cost INTEGER NOT NULL DEFAULT 0,
  shards INTEGER NOT NULL DEFAULT 0,
  loot TEXT,
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS dungeons_level_required_idx
  ON dungeons (level_required);

CREATE INDEX IF NOT EXISTS dungeons_zone_id_idx
  ON dungeons (zone_id);
