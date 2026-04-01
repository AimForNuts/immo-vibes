CREATE TABLE "enemies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"zone_id" integer,
	"image_url" text,
	"loot" jsonb,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "world_bosses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"zone_id" integer,
	"image_url" text,
	"loot" jsonb,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "zone_resources" (
	"zone_id" integer NOT NULL,
	"item_hashed_id" text NOT NULL,
	CONSTRAINT "zone_resources_zone_id_item_hashed_id_pk" PRIMARY KEY("zone_id","item_hashed_id")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level_min" integer NOT NULL,
	"level_max" integer NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dungeons" ADD COLUMN "zone_id" integer;--> statement-breakpoint
ALTER TABLE "enemies" ADD CONSTRAINT "enemies_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_bosses" ADD CONSTRAINT "world_bosses_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_resources" ADD CONSTRAINT "zone_resources_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zone_resources" ADD CONSTRAINT "zone_resources_item_hashed_id_items_hashed_id_fk" FOREIGN KEY ("item_hashed_id") REFERENCES "public"."items"("hashed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dungeons" ADD CONSTRAINT "dungeons_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE set null ON UPDATE no action;