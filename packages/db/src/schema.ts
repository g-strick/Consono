import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const genderEnum = pgEnum('gender', ['masculine', 'feminine', 'common']);

export const registerTagEnum = pgEnum('register_tag', [
  'formal',
  'neutral',
  'informal',
  'slang',
  'vulgar',
]);

export const cardKindEnum = pgEnum('card_kind', ['word', 'sentence']);

export const cardStateEnum = pgEnum('card_state', ['new', 'learning', 'review', 'relearning']);

export const ratingEnum = pgEnum('rating', ['again', 'hard', 'good', 'easy']);

export const pendingStatusEnum = pgEnum('pending_status', [
  'pending',
  'generating',
  'ready_for_review',
  'discarded',
]);

export const inputKindEnum = pgEnum('input_kind', ['word', 'sentence']);

// ─── Tables ───────────────────────────────────────────────────────────────────

/** V0: hardcoded single user. Real auth lands at V1 via Supabase Auth (ADR 0007). */
export const users = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text('email'),
  display_name: text('display_name').notNull(),
  /** TTS playback speed multiplier. Default 1.0 = native speed. */
  audio_speed: real('audio_speed').notNull().default(1.0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

/** Dedup unit. One lemma per headword per user prevents duplicate cards across word forms. */
export const lemmas = pgTable(
  'lemmas',
  {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id),
    headword: text('headword').notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    unq: uniqueIndex('lemmas_user_id_headword_idx').on(table.user_id, table.headword),
  }),
);

/**
 * Content-addressed audio store. Hash = SHA-256(text + provider + voice_id).
 * Deduplication is global across users — same text+voice never stored twice.
 * storage_url points to Supabase Storage bucket (ADR 0007).
 * provider field exists now so audio migration requires no schema change (ADR 0007).
 */
export const audio_clips = pgTable('audio_clips', {
  content_hash: text('content_hash').primaryKey(),
  text: text('text').notNull(),
  provider: text('provider').notNull(),
  voice_id: text('voice_id').notNull(),
  storage_url: text('storage_url').notNull(),
  duration_ms: integer('duration_ms').notNull(),
  generated_at: timestamp('generated_at').notNull().defaultNow(),
});

/** The reviewable unit. card_kind discriminates word vs sentence fields. */
export const cards = pgTable('cards', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  card_kind: cardKindEnum('card_kind').notNull(),
  /** Null for sentence cards. */
  lemma_id: integer('lemma_id').references(() => lemmas.id),

  // ── Word card fields (null for sentence cards) ──────────────────────────
  headword: text('headword'),
  gendered_form: text('gendered_form'),
  gender: genderEnum('gender'),
  stress_marker: text('stress_marker'),
  usage_context: text('usage_context'),
  register_tag: registerTagEnum('register_tag'),
  /** English cognate or memory hook. Null if none applies. */
  sounds_like: text('sounds_like'),

  // ── Shared fields ────────────────────────────────────────────────────────
  image_url: text('image_url'),
  image_attribution: text('image_attribution'),
  /** FK to audio_clips for the lemma pronunciation audio. */
  audio_clip_hash: text('audio_clip_hash').references(() => audio_clips.content_hash),
  sentence_pt: text('sentence_pt'),
  sentence_audio_clip_hash: text('sentence_audio_clip_hash'),
  /** Hidden in review UI — no translation crutch. Surfaced only in card editor. */
  sentence_gloss_en: text('sentence_gloss_en'),
  /** Where the user encountered this sentence (e.g. 'whatsapp', 'netflix', or custom). Nullable. */
  source_tag: text('source_tag'),

  // ── FSRS state (ts-fsrs, ADR 0006) ──────────────────────────────────────
  due_at: timestamp('due_at').notNull().defaultNow(),
  stability: real('stability'),
  difficulty: real('difficulty'),
  state: cardStateEnum('state').notNull().default('new'),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
  last_reviewed_at: timestamp('last_reviewed_at'),
  suspended_at: timestamp('suspended_at'),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

/** Immutable review log. Used for FSRS analytics and future per-user parameter tuning (V2+). */
export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  card_id: integer('card_id')
    .notNull()
    .references(() => cards.id),
  reviewed_at: timestamp('reviewed_at').notNull().defaultNow(),
  rating: ratingEnum('rating').notNull(),
  /** How long the user viewed the card before rating (ms). Nullable — not always captured. */
  duration_ms: integer('duration_ms'),
  state_before: cardStateEnum('state_before').notNull(),
  state_after: cardStateEnum('state_after').notNull(),
  /** Days until next review as scheduled by FSRS. */
  scheduled_days: real('scheduled_days'),
});

/**
 * Survives connection drops mid-generation. Transitions: pending → generating →
 * ready_for_review → (user approves → card created) | discarded.
 */
export const pending_cards = pgTable('pending_cards', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  input_text: text('input_text').notNull(),
  input_kind: inputKindEnum('input_kind').notNull(),
  status: pendingStatusEnum('status').notNull().default('pending'),
  /** Full AI-proposed card fields. Null until generation completes. */
  draft_json: jsonb('draft_json'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
