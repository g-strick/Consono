<!-- generated-by: gsd-doc-writer -->

# @portuguese-app/api

Hono-on-Node.js REST API for LingoCards — handles card generation, spaced-repetition reviews, audio serving, and aggregated home/streak statistics. Part of the [LingoCards monorepo](../../README.md).

> **V0 note:** A single hardcoded user ID is used for all requests. Real authentication via Supabase Auth is planned for V1 (ADR-0007).

## Running locally

Install dependencies from the repo root first:

```bash
pnpm install
```

Then start the API dev server:

```bash
pnpm --filter @portuguese-app/api dev
```

This runs `tsx --env-file ../../.env src/index.ts` and serves on `http://localhost:3000` by default. Override the port with `PORT=4000 pnpm --filter @portuguese-app/api dev`.

**Required environment variables** (in `.env` at the repo root — see `.env.example`):

| Variable             | Description                             |
| -------------------- | --------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string (Supabase) |
| `NARAKEET_API_KEY`   | TTS synthesis via Narakeet              |
| `NARAKEET_VOICE_ID`  | Voice identifier (default: `felipe`)    |
| `PEXELS_API_KEY`     | Image search for card generation        |
| `OPENROUTER_API_KEY` | LLM calls via OpenRouter                |

Verify the server is up:

```bash
curl http://localhost:3000/health
# {"ok":true}
```

## API endpoints

| Method | Path            | Description                                                                                    |
| ------ | --------------- | ---------------------------------------------------------------------------------------------- |
| `GET`  | `/health`       | Liveness check — returns `{ "ok": true }`                                                      |
| `POST` | `/generate`     | Generate a pending card (word or sentence) via LLM + image search                              |
| `POST` | `/cards`        | Approve a pending card, synthesize sentence audio, and persist the final card row              |
| `GET`  | `/cards/due`    | Fetch all cards due for review right now, ordered by `due_at`                                  |
| `POST` | `/reviews`      | Submit a review rating (`again`/`hard`/`good`/`easy`); updates FSRS scheduling fields          |
| `GET`  | `/audio/:hash`  | Serve a local MP3 file from `audio-cache/` by SHA-256 content hash                             |
| `GET`  | `/users/me`     | Return the current user's profile (`id`, `name`, `audio_speed`)                                |
| `GET`  | `/home/summary` | Aggregated home screen data: card count, streak, today's stats, next due, recent cards         |
| `GET`  | `/streak/stats` | Full streak detail for month/year/lifetime periods with heatmap data and best-runs leaderboard |

### `POST /generate` body

```json
{
  "input_text": "saudade",
  "kind": "word"
}
```

Returns `{ "pending_card_id": 42, "draft": { "fields": {...}, "images": [...] } }`.

### `POST /cards` body

```json
{
  "pending_card_id": 42,
  "selected_image_url": "https://...",
  "selected_image_attribution": "Photo by ...",
  "selected_sentence": "Sinto muita saudade de você.",
  "edits": {
    "stress_marker": "SAU-da-de",
    "usage_context": "Expressing longing"
  }
}
```

Returns `{ "card_id": 7 }` with HTTP 201.

### `POST /reviews` body

```json
{
  "card_id": 7,
  "rating": "good",
  "duration_ms": 3200
}
```

Returns `{ "next_due_at": "2026-06-25T09:00:00.000Z" }`.

## Source layout

```
src/
├── index.ts                    # Hono app entry point; mounts all routes; starts Node server
├── seed.ts                     # One-shot seed script — inserts the V0 user row
├── backfill-sentence-audio.ts  # One-shot backfill — synthesizes missing sentence audio clips
├── routes/
│   ├── generate.ts             # POST /generate — LLM extraction + Pexels image search
│   ├── cards.ts                # POST /cards, GET /cards/due — card approval + due queue
│   ├── reviews.ts              # POST /reviews — FSRS scheduling via ts-fsrs
│   ├── audio.ts                # GET /audio/:hash — local MP3 file server
│   ├── users.ts                # GET /users/me — user profile
│   ├── home.ts                 # GET /home/summary — home screen aggregation
│   └── streak.ts               # GET /streak/stats — streak detail with period aggregates
└── lib/
    ├── audio.ts                # contentHash() — SHA-256 keyed by text + provider + voice
    ├── constants.ts            # V0_USER_ID hardcoded single-user constant
    ├── homeSummary.ts          # Pure date math: computeStreak(), computeTodayStats()
    ├── homeSummary.test.ts     # Vitest unit tests for homeSummary functions
    ├── streakStats.ts          # Pure aggregation: computeRetention(), computeBestRuns(), heatmap helpers
    └── streakStats.test.ts     # Vitest unit tests for streakStats functions
```

**Cross-workspace coupling:** `routes/generate.ts`, `routes/cards.ts`, and `backfill-sentence-audio.ts` import provider modules from `apps/mobile/src/providers/` (`llm.ts`, `image-search.ts`, `tts.ts`). The API is not fully standalone — it shares provider code with the mobile app via direct relative imports.

**Audio cache:** Synthesized MP3 files are written to `audio-cache/` at the package root, keyed by a SHA-256 hash of `text + provider + voice`. The `/audio/:hash` route serves these files directly until Supabase Storage is wired (ADR-0007). Hash inputs are validated to 64-character hex to prevent path traversal.

## Key dependencies

| Package              | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `hono`               | HTTP framework                                                                     |
| `@hono/node-server`  | Node.js adapter for Hono                                                           |
| `@portuguese-app/db` | Shared Drizzle ORM schema and database client (workspace package)                  |
| `ts-fsrs`            | FSRS spaced-repetition algorithm — computes next due date and stability/difficulty |
| `zod`                | Request body validation                                                            |
| `tsx`                | TypeScript execution for dev and scripts                                           |

## Testing

Unit tests for the pure library functions live in `src/lib/`. Run them from the repo root:

```bash
pnpm test
```

This runs `vitest run` and picks up `apps/api/src/**/*.test.ts` per the root `vitest.config.ts`. No test script is defined inside this package's `package.json`; tests must be run from the repo root.

## Type checking

```bash
pnpm --filter @portuguese-app/api typecheck
```

Or check all packages in parallel:

```bash
pnpm typecheck
```
