CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"hashed_id" text NOT NULL,
	"idlemmo_id" integer NOT NULL,
	"name" text NOT NULL,
	"class" text NOT NULL,
	"image_url" text,
	"total_level" integer DEFAULT 0 NOT NULL,
	"location_name" text,
	"current_status" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"cached_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "characters_user_hashed_uniq" ON "characters" USING btree ("user_id","hashed_id");