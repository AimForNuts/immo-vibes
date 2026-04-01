CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level_required" integer DEFAULT 0 NOT NULL,
	"skill_items" jsonb DEFAULT '[]'::jsonb,
	"enemies" jsonb DEFAULT '[]'::jsonb,
	"dungeons" jsonb DEFAULT '[]'::jsonb,
	"world_bosses" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "store_price" integer;--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "where_to_find";
