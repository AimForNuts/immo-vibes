ALTER TABLE "items" ADD COLUMN "where_to_find" jsonb;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "price_checked_at" timestamp;