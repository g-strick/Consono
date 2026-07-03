<!-- generated-by: gsd-doc-writer -->

# Consono

AI-native Brazilian Portuguese learning app — Fluent Forever-style, personal daily driver first.

## What it does

Type a Portuguese word or sentence. The LLM (Gemini 2.5 Flash Lite via OpenRouter) fills in pronunciation, gender, register tag, an i+1 example sentence, and an English memory hook. Pexels provides a contextual image. Narakeet TTS generates native-speaker audio (voice: Felipe). Cards are reviewed daily using FSRS — audio-first, no translation crutch.

## Repository layout

```text
.
├── apps/
│   ├── api/        Hono API server (card generation, FSRS reviews, audio, streak)
│   └── mobile/     Expo app (Expo Router, NativeWind, TanStack Query)
├── packages/
│   └── db/         Drizzle ORM schema + Supabase Postgres connection
├── prompts/        versioned AI prompts (card generation)
├── data/           source data (frequency lists)
├── scripts/        one-off utilities (audio prewarm, frequency ingest)
└── docs/           specs, ADRs, runbooks, glossary
```

## Stack

| Layer             | Technology                                             |
| ----------------- | ------------------------------------------------------ |
| Mobile            | Expo 54 · React Native 0.81 · expo-router v6           |
| Styling           | NativeWind v4 (Tailwind)                               |
| Server state      | TanStack Query v5                                      |
| Gestures          | react-native-gesture-handler · react-native-reanimated |
| API server        | Hono 4 on Node.js (port 3000)                          |
| Database          | Drizzle ORM · PostgreSQL (Supabase)                    |
| Spaced repetition | FSRS v5 via ts-fsrs                                    |
| LLM               | OpenRouter → Gemini 2.5 Flash Lite                     |
| TTS               | Narakeet (voice: Felipe)                               |
| Image search      | Pexels                                                 |

## Prerequisites

- **Node.js 22.x** — `nvm use` or `fnm install && fnm use`
- **pnpm 11** via Corepack — `corepack enable`
- **Expo Go** on your iOS or Android device
- **Supabase project** with a Postgres database

## Environment variables

Copy `.env.example` to `.env` in the repo root and fill in your secrets:

```bash
NARAKEET_API_KEY=your_key_here
NARAKEET_VOICE_ID=felipe
PEXELS_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

`EXPO_PUBLIC_API_URL` is set per-session when starting the mobile dev server (see Quick Start below).

## Quick start

**Install once:**

```bash
corepack enable
make install
make db-migrate
make api-seed    # seeds the hardcoded V0 user row
```

**Then open two terminals:**

Terminal 1 — API server:

```bash
make api
# Runs on http://localhost:3000
# Verify: http://localhost:3000/health → {"ok":true}
```

Terminal 2 — Expo / Metro:

```bash
# Use your machine's LAN IP so your phone can reach the API over Wi-Fi
EXPO_PUBLIC_API_URL=http://<your-local-ip>:3000 make mobile
```

On your phone: open **Expo Go**, tap **Scan QR Code**, scan the QR printed by Metro.

## Make targets

```bash
make install        # install all dependencies
make api            # start API server (port 3000)
make mobile         # start Expo / Metro bundler
make test           # run unit tests (Vitest)
make typecheck      # TypeScript type check (all packages)
make lint           # ESLint + markdownlint + cspell
make format         # Prettier
make check          # typecheck + lint + test (what CI runs)
make db-generate    # generate SQL migration from schema changes
make db-migrate     # apply pending migrations to Supabase DB
make db-studio      # open Drizzle Studio DB browser
make api-seed       # seed the V0 hardcoded user row
make prewarm-audio  # pre-generate TTS for top-N frequency words
```

## API routes

| Method   | Path               | Description                                         |
| -------- | ------------------ | --------------------------------------------------- |
| `GET`    | `/health`          | Health check                                        |
| `POST`   | `/generate/fields` | LLM card field extraction (creates pending card)    |
| `POST`   | `/generate/images` | Pexels image search for a pending card              |
| `GET`    | `/cards`           | List all user cards (supports state/kind filters)   |
| `GET`    | `/cards/:id`       | Card detail                                         |
| `PATCH`  | `/cards/:id`       | Update card fields                                  |
| `DELETE` | `/cards/:id`       | Delete a card                                       |
| `POST`   | `/reviews`         | Submit an FSRS review rating (Again/Hard/Good/Easy) |
| `GET`    | `/home/summary`    | Home screen aggregation (streak, due count, stats)  |
| `GET`    | `/streak/stats`    | Retention %, heat map data, best-run streaks        |
| `GET`    | `/users/me`        | Current user profile                                |
| `GET`    | `/audio/:hash`     | Serve cached TTS audio clip                         |

## Mobile screens

- **Home** — due-card count, current streak chip, next-due time, recent words
- **Review** — audio-first card flip with FSRS rating buttons
- **Add wizard** — multi-step: input → loading (LLM fields) → image pick → sentence edit → approve
- **Library** — filter chips (All / New / Learning / Review / Suspended), swipe-to-suspend/delete actions, `SwipeableRow` component
- **Card detail** — full card view at `/cards/[id]`
- **Streak** — retention percentage, review heat map, best-run stats
- **Settings** — user preferences

## Database schema

Core tables: `users`, `cards`, `lemmas`, `reviews`, `audio_clips`, `pending_cards`.

Cards store full FSRS state (`due_at`, `stability`, `difficulty`, `state`, `reps`, `lapses`, `suspended_at`). Audio is content-addressed by SHA-256 of `text + provider + voice_id` — same text is never stored twice. `pending_cards` tracks generation pipeline state so connection drops do not lose in-progress drafts.

## Development status

- Phases 1–5 complete (add wizard, home/streak screens, library redesign, card detail, CRUD routes)
- Phase 6 (Supabase Auth + cloud sync) next
- Current build uses a hardcoded single-user model — auth intentionally deferred

## Key documents

- **AGENTS.md** — entry point for AI coding tools
- **docs/decisions/** — load-bearing architectural decisions (ADRs)
- **docs/glossary.md** — lemma, FSRS, i+1, CEFR, register tag, etc.
- **.planning/STATE.md** — current project phase and plan status

## License

Private — all rights reserved.
