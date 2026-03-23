CREATE TABLE "character_pets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"character_hashed_id" text NOT NULL,
	"pet_id" integer NOT NULL,
	"name" text NOT NULL,
	"custom_name" text,
	"image_url" text,
	"level" integer NOT NULL,
	"quality" text NOT NULL,
	"strength" integer DEFAULT 0 NOT NULL,
	"defence" integer DEFAULT 0 NOT NULL,
	"speed" integer DEFAULT 0 NOT NULL,
	"evolution_state" integer DEFAULT 0 NOT NULL,
	"evolution_max" integer DEFAULT 5 NOT NULL,
	"evolution_bonus_per_stage" integer DEFAULT 5 NOT NULL,
	"synced_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_pets" ADD CONSTRAINT "character_pets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "character_pets_user_char_uniq" ON "character_pets" USING btree ("user_id","character_hashed_id");