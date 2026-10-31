ALTER TABLE "user" ADD COLUMN "favorite_translations" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "other_translations" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "favorites_only" boolean DEFAULT false NOT NULL;