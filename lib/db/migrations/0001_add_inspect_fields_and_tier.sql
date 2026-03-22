CREATE TABLE IF NOT EXISTS "sync_state" (
	"job" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"current_type_index" integer DEFAULT 0 NOT NULL,
	"current_page" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
DROP INDEX "market_price_history_uniq";--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "is_tradeable" boolean;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "max_tier" integer;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "requirements" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "base_stats" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "tier_modifiers" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "effects" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "recipe" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "inspected_at" timestamp;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "price_checked_at" timestamp;--> statement-breakpoint
ALTER TABLE "market_price_history" ADD COLUMN "tier" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "market_price_history_uniq" ON "market_price_history" USING btree ("item_hashed_id","tier","sold_at");