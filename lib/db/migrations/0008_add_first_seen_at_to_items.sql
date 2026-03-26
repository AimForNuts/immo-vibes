ALTER TABLE "items" ADD COLUMN "first_seen_at" timestamp DEFAULT now() NOT NULL;
UPDATE "items" SET "first_seen_at" = "synced_at";