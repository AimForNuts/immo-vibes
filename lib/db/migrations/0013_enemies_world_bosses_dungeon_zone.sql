-- Migration 0013: add enemies and world_bosses tables; replace dungeons.location with zone_id FK

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enemies" (
  "id"         serial PRIMARY KEY,
  "name"       text NOT NULL,
  "level"      integer NOT NULL DEFAULT 0,
  "zone_id"    integer REFERENCES "zones"("id") ON DELETE SET NULL,
  "image_url"  text,
  "loot"       jsonb,
  "synced_at"  timestamp
);

--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "world_bosses" (
  "id"         serial PRIMARY KEY,
  "name"       text NOT NULL,
  "level"      integer NOT NULL DEFAULT 0,
  "zone_id"    integer REFERENCES "zones"("id") ON DELETE SET NULL,
  "image_url"  text,
  "loot"       jsonb,
  "synced_at"  timestamp
);

--> statement-breakpoint
ALTER TABLE "dungeons" DROP COLUMN IF EXISTS "location";

--> statement-breakpoint
ALTER TABLE "dungeons"
  ADD COLUMN IF NOT EXISTS "zone_id" integer REFERENCES "zones"("id") ON DELETE SET NULL;
