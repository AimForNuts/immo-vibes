ALTER TABLE "character_pets" RENAME COLUMN "strength" TO "attack_power";--> statement-breakpoint
ALTER TABLE "character_pets" RENAME COLUMN "defence" TO "protection";--> statement-breakpoint
ALTER TABLE "character_pets" RENAME COLUMN "speed" TO "agility";--> statement-breakpoint
ALTER TABLE "character_pets" ADD COLUMN "accuracy" integer;--> statement-breakpoint
ALTER TABLE "character_pets" ADD COLUMN "max_stamina" integer;--> statement-breakpoint
ALTER TABLE "character_pets" ADD COLUMN "movement_speed" numeric(6, 1);--> statement-breakpoint
ALTER TABLE "character_pets" ADD COLUMN "critical_chance" integer;--> statement-breakpoint
ALTER TABLE "character_pets" ADD COLUMN "critical_damage" integer;
