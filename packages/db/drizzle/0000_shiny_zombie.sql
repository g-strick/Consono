CREATE TYPE "public"."card_kind" AS ENUM('word', 'sentence');--> statement-breakpoint
CREATE TYPE "public"."card_state" AS ENUM('new', 'learning', 'review', 'relearning');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('masculine', 'feminine', 'common');--> statement-breakpoint
CREATE TYPE "public"."input_kind" AS ENUM('word', 'sentence');--> statement-breakpoint
CREATE TYPE "public"."pending_status" AS ENUM('pending', 'generating', 'ready_for_review', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."register_tag" AS ENUM('formal', 'neutral', 'informal', 'slang', 'vulgar');--> statement-breakpoint
CREATE TABLE "audio_clips" (
	"content_hash" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"provider" text NOT NULL,
	"voice_id" text NOT NULL,
	"storage_url" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"card_kind" "card_kind" NOT NULL,
	"lemma_id" integer,
	"headword" text,
	"gendered_form" text,
	"gender" "gender",
	"stress_marker" text,
	"usage_context" text,
	"register_tag" "register_tag",
	"sounds_like" text,
	"image_url" text,
	"image_attribution" text,
	"audio_clip_hash" text,
	"sentence_pt" text,
	"sentence_audio_clip_hash" text,
	"sentence_gloss_en" text,
	"due_at" timestamp DEFAULT now() NOT NULL,
	"stability" real,
	"difficulty" real,
	"state" "card_state" DEFAULT 'new' NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lemmas" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"headword" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"input_text" text NOT NULL,
	"input_kind" "input_kind" NOT NULL,
	"status" "pending_status" DEFAULT 'pending' NOT NULL,
	"draft_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"rating" "rating" NOT NULL,
	"duration_ms" integer,
	"state_before" "card_state" NOT NULL,
	"state_after" "card_state" NOT NULL,
	"scheduled_days" real
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"display_name" text NOT NULL,
	"audio_speed" real DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_lemma_id_lemmas_id_fk" FOREIGN KEY ("lemma_id") REFERENCES "public"."lemmas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_audio_clip_hash_audio_clips_content_hash_fk" FOREIGN KEY ("audio_clip_hash") REFERENCES "public"."audio_clips"("content_hash") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lemmas" ADD CONSTRAINT "lemmas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_cards" ADD CONSTRAINT "pending_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lemmas_user_id_headword_idx" ON "lemmas" USING btree ("user_id","headword");