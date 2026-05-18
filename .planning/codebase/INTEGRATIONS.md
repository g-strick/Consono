# External Integrations

**Analysis Date:** 2026-05-18

## APIs & External Services

**LLM (Card Generation):**

- OpenRouter — routes to `google/gemini-2.5-flash-lite` for card field extraction
  - SDK/Client: native `fetch` (no SDK)
  - Endpoint: `https://openrouter.ai/api/v1/messages`
  - Auth: `OPENROUTER_API_KEY` env var (Anthropic-style header: `x-api-key`)
  - Provider file: `apps/mobile/src/providers/llm.ts`
  - Input validation: Zod schema (`WordFieldsOutputSchema`) — every LLM response validated before use
  - Model: `google/gemini-2.5-flash-lite`, temperature 0.2, max_tokens 1024
  - Prompt source: `prompts/card-generation/extract-word-fields.ts` (versioned, not inline)

**Text-to-Speech:**

- Narakeet — Brazilian Portuguese TTS, voice "felipe" (ADR 0004)
  - SDK/Client: native `fetch` (no SDK)
  - Endpoint: `https://api.narakeet.com/text-to-speech/mp3?voice=felipe`
  - Auth: `NARAKEET_API_KEY` env var (header: `x-api-key`)
  - Provider file: `apps/mobile/src/providers/tts.ts`
  - Output: MP3 audio, 128kbps, cached locally to `audio-cache/` directory (content-addressed SHA-256 hash)
  - Provider is swappable — interface designed for future ElevenLabs/Azure additions (ADR 0004)

**Image Search:**

- Pexels — stock photo search for card illustrations
  - SDK/Client: native `fetch` (no SDK)
  - Endpoint: `https://api.pexels.com/v1/search`
  - Auth: `PEXELS_API_KEY` env var (header: `Authorization`)
  - Provider file: `apps/mobile/src/providers/image-search.ts`
  - Returns 4 photos per query with attribution; Zod-validated (`PexelsResponseSchema`)

## Data Storage

**Databases:**

- PostgreSQL via Supabase (ADR 0007)
  - Connection: `DATABASE_URL` env var (standard PostgreSQL URI)
  - Client: Drizzle ORM 0.44.0 + `pg` driver 8.13.0 (TCP, NOT Supabase JS client — ADR 0007)
  - Client file: `packages/db/src/index.ts`
  - Schema file: `packages/db/src/schema.ts`
  - Tables: `users`, `lemmas`, `cards`, `reviews`, `pending_cards`, `audio_clips`
  - Migrations: Drizzle Kit (`packages/db/drizzle/` directory, `drizzle.config.ts`)

**File Storage:**

- Audio clips: local filesystem (`audio-cache/` directory) at V0
  - Planned migration to Supabase Storage bucket at V0+ (ADR 0007, noted in `apps/api/src/routes/audio.ts`)
  - `audio_clips.storage_url` field in DB already structured for Supabase Storage URL
  - `audio_clips.provider` field tracks provider (currently `'narakeet'`) for future multi-provider support
  - Served by API at `GET /audio/:hash` — 64-char hex SHA-256 hash

**Caching:**

- Audio: content-addressed local cache (`audio-cache/{sha256hash}.mp3`)
  - Hash = SHA-256(`text + provider + voice_id`) — globally deduplicates same text+voice
  - `apps/mobile/src/providers/tts.ts` writes cache; `apps/api/src/routes/audio.ts` reads and serves it

## Authentication & Identity

**Auth Provider:**

- None at V0 — hardcoded single user
  - Hardcoded UUID: `'00000000-0000-0000-0000-000000000001'` in `apps/api/src/lib/constants.ts`
  - Planned: Supabase Auth at V1 (ADR 0007)
  - `users` table already has `email` and `display_name` columns in preparation for real auth

## Monitoring & Observability

**Error Tracking:**

- None at V0

**Logs:**

- `console.log` / `console.error` in provider files on API errors
- API server startup logged: `"API running on http://localhost:{port}"`
- No structured logging framework

## CI/CD & Deployment

**Hosting:**

- Mobile: Expo managed build (target: iOS App Store + Google Play; bundle IDs in `apps/mobile/app.json`)
- API: Not yet deployed — runs locally on Node.js 22 at V0
- Database: Supabase-hosted PostgreSQL (free tier at V0)

**CI Pipeline:**

- GitHub Actions — `.github/workflows/ci.yml`
  - Triggers: push/PR to `main`
  - Steps: `pnpm install --frozen-lockfile` → `format:check` → `typecheck` → `lint` → `mdlint` → `spellcheck` → `test`
  - Node version from `.nvmrc`
  - pnpm store cached via `actions/cache`

**Release Automation:**

- Release Please — `.github/workflows/release-please.yml`
  - Config: `release-please-config.json`
  - Triggers: push to `main`
  - Permissions: write contents + pull-requests
  - Release type: `node`

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` — PostgreSQL connection string (Supabase URI format: `postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres`)
- `OPENROUTER_API_KEY` — OpenRouter API key for LLM calls
- `NARAKEET_API_KEY` — Narakeet API key for TTS synthesis
- `PEXELS_API_KEY` — Pexels API key for image search
- `EXPO_PUBLIC_API_URL` — Mobile app API base URL (falls back to `http://localhost:3000`)
- `PORT` — API server port (optional; defaults to `3000`)

**Secrets location:**

- `.env` at repo root (gitignored)
- `.env.example` committed with placeholder values

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## Provider Architecture

All external service integrations are accessed exclusively through provider files (ADR 0005):

| Provider     | File                                        | Service             | Key                  |
| ------------ | ------------------------------------------- | ------------------- | -------------------- |
| LLM          | `apps/mobile/src/providers/llm.ts`          | OpenRouter → Gemini | `OPENROUTER_API_KEY` |
| TTS          | `apps/mobile/src/providers/tts.ts`          | Narakeet            | `NARAKEET_API_KEY`   |
| Image Search | `apps/mobile/src/providers/image-search.ts` | Pexels              | `PEXELS_API_KEY`     |
| DB Client    | `packages/db/src/index.ts`                  | Supabase Postgres   | `DATABASE_URL`       |

**Rule (ADR 0005):** TTS, image search, LLM, and audio storage are accessed only through these
provider files. New external integrations require an ADR before adding a provider.

**Note:** Provider files currently live in `apps/mobile/src/providers/` for historical reasons.
The API (`apps/api`) imports them directly from this path. Do not move without updating all
imports.

---

_Integration audit: 2026-05-18_
