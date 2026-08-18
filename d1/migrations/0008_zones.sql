CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  level_required INTEGER NOT NULL DEFAULT 0,
  enemies TEXT NOT NULL DEFAULT '[]',
  dungeons TEXT NOT NULL DEFAULT '[]',
  world_bosses TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS zones_level_required_idx
  ON zones (level_required);

CREATE TABLE IF NOT EXISTS item_zones (
  item_hashed_id TEXT NOT NULL,
  zone_id INTEGER NOT NULL,
  PRIMARY KEY (item_hashed_id, zone_id)
);

CREATE INDEX IF NOT EXISTS item_zones_zone_id_idx
  ON item_zones (zone_id);
