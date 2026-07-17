ALTER TABLE "albums" ADD COLUMN "unavailable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "unavailable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "unavailable" boolean DEFAULT false NOT NULL;