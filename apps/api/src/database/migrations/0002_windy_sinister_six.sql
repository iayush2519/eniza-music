CREATE TABLE "listening_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"played_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_listened_seconds" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"result_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"explicit_content_enabled" boolean DEFAULT true NOT NULL,
	"autoplay_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "artists" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "albums" ADD COLUMN "last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "artists" ADD COLUMN "last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "last_refreshed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listening_history" ADD CONSTRAINT "listening_history_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "albums_provider_id_external_id_idx" ON "albums" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "artists_provider_id_external_id_idx" ON "artists" USING btree ("provider_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tracks_provider_id_external_id_idx" ON "tracks" USING btree ("provider_id","external_id");