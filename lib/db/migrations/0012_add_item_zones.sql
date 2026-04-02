ALTER TABLE "zones" DROP COLUMN IF EXISTS "skill_items";--> statement-breakpoint
CREATE TABLE "item_zones" (
	"item_hashed_id" text NOT NULL,
	"zone_id" integer NOT NULL,
	CONSTRAINT "item_zones_pkey" PRIMARY KEY("item_hashed_id","zone_id")
);
--> statement-breakpoint
ALTER TABLE "item_zones" ADD CONSTRAINT "item_zones_item_hashed_id_items_hashed_id_fk" FOREIGN KEY ("item_hashed_id") REFERENCES "public"."items"("hashed_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_zones" ADD CONSTRAINT "item_zones_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;
