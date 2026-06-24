<!-- generated-by: gsd-doc-writer -->

# @portuguese-app/db

Drizzle ORM schema and database client for the LingoCards monorepo. This package owns the PostgreSQL schema, migration files, and exports a typed `db` client used by all server-side consumers (primarily `apps/api`).

Part of the [LingoCards monorepo](../../README.md).

---

## What this package exports

```ts
import { db } from '@portuguese-app/db';
// db is a drizzle-orm client with full schema types attached

import { cards, users, reviews, lemmas, audio_clips, pending_cards } from '@portuguese-app/db';
// All table definitions and enum types re-exported from src/schema.ts
```

`src/index.ts` exports:

- `db` — the Drizzle client (connected via a `pg` Pool, requires `DATABASE_URL`)
- All table objects and enum values from `src/schema.ts`

---

## Environment variable

| Variable       | Required | Description                                                          |
| -------------- | -------- | -------------------------------------------------------------------- |
| `DATABASE_URL` | Required | Full PostgreSQL connection string. Loaded from the root `.env` file. |

The client throws `Error: DATABASE_URL is not set` at import time if the variable is absent.

The root `.env` file (at `../../.env` relative to this package) is loaded automatically by `drizzle.config.ts` when running migration commands.

---

## Database schema

### Enums

| Enum             | Values                                                   |
| ---------------- | -------------------------------------------------------- |
| `gender`         | `masculine`, `feminine`, `common`                        |
| `register_tag`   | `formal`, `neutral`, `informal`, `slang`, `vulgar`       |
| `card_kind`      | `word`, `sentence`                                       |
| `card_state`     | `new`, `learning`, `review`, `relearning`                |
| `rating`         | `again`, `hard`, `good`, `easy`                          |
| `pending_status` | `pending`, `generating`, `ready_for_review`, `discarded` |
| `input_kind`     | `word`, `sentence`                                       |

### Tables

#### `users`

Hardcoded single user in V0. Real auth (Supabase Auth) lands at V1.

| Column         | Type        | Notes                                  |
| -------------- | ----------- | -------------------------------------- |
| `id`           | `uuid` PK   | `gen_random_uuid()` default            |
| `email`        | `text`      | Nullable                               |
| `display_name` | `text`      | Not null                               |
| `audio_speed`  | `real`      | TTS playback multiplier, default `1.0` |
| `created_at`   | `timestamp` |                                        |
| `updated_at`   | `timestamp` |                                        |

#### `lemmas`

Deduplication unit — one lemma per headword per user. Prevents duplicate cards across word forms.

| Column       | Type        | Notes           |
| ------------ | ----------- | --------------- |
| `id`         | `serial` PK |                 |
| `user_id`    | `uuid`      | FK → `users.id` |
| `headword`   | `text`      |                 |
| `created_at` | `timestamp` |                 |

Unique index on `(user_id, headword)`.

#### `audio_clips`

Content-addressed audio store. The primary key is a SHA-256 hash of `text + provider + voice_id`, so the same text and voice combination is never stored twice across any user.

| Column         | Type        | Notes                                 |
| -------------- | ----------- | ------------------------------------- |
| `content_hash` | `text` PK   | SHA-256 of text + provider + voice_id |
| `text`         | `text`      | The spoken text                       |
| `provider`     | `text`      | TTS provider name                     |
| `voice_id`     | `text`      | Voice identifier                      |
| `storage_url`  | `text`      | Supabase Storage bucket URL           |
| `duration_ms`  | `integer`   | Audio length in milliseconds          |
| `generated_at` | `timestamp` |                                       |

#### `cards`

The core reviewable unit. `card_kind` discriminates `word` vs `sentence` cards. Word-specific fields are null for sentence cards.

| Column                     | Type           | Notes                                     |
| -------------------------- | -------------- | ----------------------------------------- |
| `id`                       | `serial` PK    |                                           |
| `user_id`                  | `uuid`         | FK → `users.id`                           |
| `card_kind`                | `card_kind`    | `word` or `sentence`                      |
| `lemma_id`                 | `integer`      | FK → `lemmas.id`, null for sentence cards |
| `headword`                 | `text`         | Word cards only                           |
| `gendered_form`            | `text`         | Word cards only                           |
| `gender`                   | `gender`       | Word cards only                           |
| `stress_marker`            | `text`         | Word cards only                           |
| `usage_context`            | `text`         | Word cards only                           |
| `register_tag`             | `register_tag` | Word cards only                           |
| `sounds_like`              | `text`         | English cognate/memory hook, null if none |
| `image_url`                | `text`         | Shared                                    |
| `image_attribution`        | `text`         | Shared                                    |
| `audio_clip_hash`          | `text`         | FK → `audio_clips.content_hash`           |
| `sentence_pt`              | `text`         | Portuguese example sentence               |
| `sentence_audio_clip_hash` | `text`         | Audio for the example sentence            |
| `sentence_gloss_en`        | `text`         | English gloss, hidden in review UI        |
| `due_at`                   | `timestamp`    | FSRS next review time                     |
| `stability`                | `real`         | FSRS stability value                      |
| `difficulty`               | `real`         | FSRS difficulty value                     |
| `state`                    | `card_state`   | FSRS state, default `new`                 |
| `reps`                     | `integer`      | Total review count, default `0`           |
| `lapses`                   | `integer`      | Lapse count, default `0`                  |
| `last_reviewed_at`         | `timestamp`    | Nullable                                  |
| `created_at`               | `timestamp`    |                                           |
| `updated_at`               | `timestamp`    |                                           |

#### `reviews`

Immutable review log. Used for FSRS analytics and future per-user parameter tuning.

| Column           | Type         | Notes                                       |
| ---------------- | ------------ | ------------------------------------------- |
| `id`             | `serial` PK  |                                             |
| `card_id`        | `integer`    | FK → `cards.id`                             |
| `reviewed_at`    | `timestamp`  |                                             |
| `rating`         | `rating`     | `again`, `hard`, `good`, or `easy`          |
| `duration_ms`    | `integer`    | Time on card before rating (ms), nullable   |
| `state_before`   | `card_state` | FSRS state before review                    |
| `state_after`    | `card_state` | FSRS state after review                     |
| `scheduled_days` | `real`       | Days until next review as scheduled by FSRS |

#### `pending_cards`

Tracks AI card generation jobs across connection drops. State machine: `pending` → `generating` → `ready_for_review` → card created or `discarded`.

| Column       | Type             | Notes                                                    |
| ------------ | ---------------- | -------------------------------------------------------- |
| `id`         | `serial` PK      |                                                          |
| `user_id`    | `uuid`           | FK → `users.id`                                          |
| `input_text` | `text`           | User's original input                                    |
| `input_kind` | `input_kind`     | `word` or `sentence`                                     |
| `status`     | `pending_status` | Default `pending`                                        |
| `draft_json` | `jsonb`          | AI-proposed card fields, null until generation completes |
| `created_at` | `timestamp`      |                                                          |
| `updated_at` | `timestamp`      |                                                          |

---

## Migrations

Migration files live in `drizzle/` and are managed by `drizzle-kit`. Run all commands from the **monorepo root** using `make`:

```bash
# Generate a new SQL migration after editing src/schema.ts
make db-generate

# Apply all pending migrations to the database
make db-migrate
```

These `make` targets `cd` into `packages/db/` before invoking `drizzle-kit`, so `drizzle.config.ts` resolves the root `.env` correctly.

To run `drizzle-kit` directly from inside this package:

```bash
cd packages/db
pnpm exec drizzle-kit generate
pnpm exec drizzle-kit migrate
```

Migration files are stored in `drizzle/` with a `_journal.json` tracking which have been applied.

---

## Drizzle Studio

Drizzle Studio is a local database browser. Start it from the monorepo root:

```bash
make db-studio
```

Or directly from this package:

```bash
cd packages/db
pnpm exec drizzle-kit studio
```

`DATABASE_URL` must be set (via the root `.env` file) before running Studio.

---

## Usage in other packages

```ts
import { db, cards, users } from '@portuguese-app/db';
import { eq } from 'drizzle-orm';

// Fetch all cards due for review
const dueCards = await db.select().from(cards).where(eq(cards.user_id, userId));
```

The `db` export is a Drizzle client with the full schema attached, giving you typed query results for all tables.
