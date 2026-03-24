CREATE TABLE "dungeons" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"location" text,
	"level_required" integer DEFAULT 0 NOT NULL,
	"difficulty" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"gold_cost" integer DEFAULT 0 NOT NULL,
	"shards" integer DEFAULT 0 NOT NULL,
	"loot" jsonb,
	"synced_at" timestamp NOT NULL
);
