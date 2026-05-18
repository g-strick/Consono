<!-- refreshed: 2026-05-18 -->

# Architecture

**Analysis Date:** 2026-05-18

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Expo React Native App                     │
│              `apps/mobile/app/(tabs)/`                       │
│   Home · Cards · Add Wizard · Settings · Review · Streak    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (fetch via api.ts)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hono API Server                           │
│                   `apps/api/src/`                            │
│  /generate · /cards · /cards/due · /reviews · /audio/:hash  │
└────────┬──────────────┬──────────────────┬──────────────────┘
         │              │                  │
         ▼              ▼                  ▼
  OpenRouter       Narakeet TTS        Pexels API
  (Gemini 2.5      `providers/tts.ts`  `providers/
   Flash Lite)                          image-search.ts`
  `providers/llm.ts`
         │              │
         └──────┬────────┘
                ▼
┌─────────────────────────────────────────────────────────────┐
│                     @portuguese-app/db                       │
│                  `packages/db/src/`                          │
│   Drizzle ORM + pg pool → PostgreSQL                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (DATABASE_URL)                       │
│  users · lemmas · cards · audio_clips · reviews             │
│  pending_cards                                               │
└─────────────────────────────────────────────────────────────┘
                           +
┌─────────────────────────────────────────────────────────────┐
│              Local audio-cache/ (V0 stub)                    │
│  `audio-cache/<sha256>.mp3`                                  │
│  Replaces Supabase Storage until ADR 0007 is implemented     │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component                  | Responsibility                                                                   | File                                             |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------ |
| Root Layout                | QueryClient + ThemeContext providers, Stack navigator                            | `apps/mobile/app/_layout.tsx`                    |
| Tab Layout                 | 4-tab navigator: Home, Cards, Add, Settings                                      | `apps/mobile/app/(tabs)/_layout.tsx`             |
| Home Screen                | Due card counts, streak chip, start review CTA                                   | `apps/mobile/app/(tabs)/index.tsx`               |
| Add Screen                 | Multi-step wizard: input → generate → pick image → pick sentence → review → save | `apps/mobile/app/(tabs)/add/index.tsx`           |
| Cards Screen               | Filterable list of all due cards                                                 | `apps/mobile/app/(tabs)/cards/index.tsx`         |
| Settings Screen            | Static read-only settings display                                                | `apps/mobile/app/(tabs)/settings/index.tsx`      |
| Review Screen              | Full-screen modal: front/back flashcard loop with FSRS rating                    | `apps/mobile/app/review/index.tsx`               |
| Streak Screen              | Static streak stats (V0 stub)                                                    | `apps/mobile/app/streak/index.tsx`               |
| api.ts                     | Typed fetch wrapper for all API calls                                            | `apps/mobile/src/lib/api.ts`                     |
| theme.ts                   | Color constants + ThemeContext                                                   | `apps/mobile/src/lib/theme.ts`                   |
| StreakChip                 | Animated streak badge navigating to /streak                                      | `apps/mobile/src/components/StreakChip.tsx`      |
| llm.ts                     | OpenRouter/Gemini card field extraction                                          | `apps/mobile/src/providers/llm.ts`               |
| tts.ts                     | Narakeet TTS synthesis with local disk cache                                     | `apps/mobile/src/providers/tts.ts`               |
| image-search.ts            | Pexels image search, returns 4 results                                           | `apps/mobile/src/providers/image-search.ts`      |
| API index.ts               | Hono app: mounts routes, starts server                                           | `apps/api/src/index.ts`                          |
| generate route             | Creates pending_card, calls LLM+TTS+Images in parallel                           | `apps/api/src/routes/generate.ts`                |
| cards route                | POST approve pending→card; GET /due for review queue                             | `apps/api/src/routes/cards.ts`                   |
| reviews route              | POST review with FSRS scheduling via ts-fsrs                                     | `apps/api/src/routes/reviews.ts`                 |
| audio route                | GET /audio/:hash — serves local MP3 files                                        | `apps/api/src/routes/audio.ts`                   |
| db package                 | Drizzle client + full schema export                                              | `packages/db/src/index.ts`                       |
| schema.ts                  | All 6 tables + 7 enums                                                           | `packages/db/src/schema.ts`                      |
| extract-word-fields prompt | Zod-typed prompt builder for LLM card generation                                 | `prompts/card-generation/extract-word-fields.ts` |

## Pattern Overview

**Overall:** Monorepo with a thin API layer (Hono) orchestrating external AI services, consumed by a React Native (Expo) mobile app via a typed fetch client. No client-side state management library — server state lives in TanStack Query cache, UI state is local `useState`.

**Key Characteristics:**

- Providers (`llm.ts`, `tts.ts`, `image-search.ts`) live in `apps/mobile/src/providers/` but are imported directly by the API server — a cross-workspace boundary violation that works at V0 due to local path imports
- Two-phase card creation: `pending_cards` row survives failures; only promoted to `cards` on user approval
- Content-addressed audio: SHA-256(text + provider + voiceId) deduplicates TTS calls globally
- FSRS spaced repetition via `ts-fsrs` library runs entirely in the API route (not the client)
- V0 hardcoded single user: `V0_USER_ID = '00000000-0000-0000-0000-000000000001'`

## Layers

**Mobile UI Layer:**

- Purpose: Screen rendering, navigation, user interaction
- Location: `apps/mobile/app/`
- Contains: Expo Router file-based route screens, layouts
- Depends on: `src/lib/api.ts`, `src/lib/theme.ts`, `src/components/`, TanStack Query
- Used by: End user

**Mobile Support Layer:**

- Purpose: Typed API client, theme tokens, reusable components
- Location: `apps/mobile/src/`
- Contains: `lib/api.ts`, `lib/theme.ts`, `components/StreakChip.tsx`, `providers/`
- Depends on: API server (network), React Native
- Used by: Screen files in `apps/mobile/app/`

**External Provider Layer:**

- Purpose: Wraps third-party AI/media APIs with typed interfaces
- Location: `apps/mobile/src/providers/`
- Contains: `llm.ts` (OpenRouter), `tts.ts` (Narakeet), `image-search.ts` (Pexels)
- Depends on: External APIs, env vars, local filesystem (audio cache)
- Used by: `apps/api/src/routes/generate.ts` (imported via relative path)

**API Route Layer:**

- Purpose: HTTP endpoints, orchestration, business logic
- Location: `apps/api/src/routes/`
- Contains: `generate.ts`, `cards.ts`, `reviews.ts`, `audio.ts`
- Depends on: `@portuguese-app/db`, provider layer, `ts-fsrs`
- Used by: Mobile app via HTTP

**Data Layer:**

- Purpose: Database schema definition, connection, ORM client
- Location: `packages/db/src/`
- Contains: `schema.ts` (6 tables, 7 enums), `index.ts` (drizzle + pg pool)
- Depends on: `DATABASE_URL` env var, PostgreSQL
- Used by: API routes

**Prompt Layer:**

- Purpose: Versioned LLM prompt builders with Zod I/O schemas
- Location: `prompts/card-generation/`
- Contains: `extract-word-fields.ts`
- Depends on: `zod`
- Used by: `apps/mobile/src/providers/llm.ts`

## Data Flow

### Card Creation (Add Wizard)

1. User types a word in `AddScreen` → calls `api.generate()` (`apps/mobile/src/lib/api.ts:61`)
2. `POST /generate` received by Hono (`apps/api/src/routes/generate.ts:18`)
3. Inserts `pending_cards` row with status `generating`
4. Calls `extractWordFields()` (`apps/mobile/src/providers/llm.ts:17`) → OpenRouter/Gemini returns JSON
5. In parallel: `synthesize()` (Narakeet TTS → local MP3) + `searchImages()` (Pexels 4 images)
6. Upserts `audio_clips` row; updates `pending_cards` status to `ready_for_review`, stores `draft_json`
7. Returns draft to mobile app
8. User picks image + sentence, optionally edits fields → calls `api.approveCard()`
9. `POST /cards` (`apps/api/src/routes/cards.ts:25`) upserts `lemmas`, inserts `cards` row, marks `pending_card` as `discarded`
10. TanStack Query invalidates `['cards', 'due']` cache

### Review Session

1. `ReviewScreen` loads due cards via `useQuery` → `GET /cards/due` (`apps/api/src/routes/cards.ts:105`)
2. Cards filtered by `due_at <= now()` for `V0_USER_ID`, ordered by due date
3. For each card: mobile plays audio via `Audio.Sound.createAsync` (expo-av) from `/audio/:hash`
4. `GET /audio/:hash` (`apps/api/src/routes/audio.ts:11`) streams MP3 from local `audio-cache/` directory
5. User rates card (again/hard/good/easy) → `POST /reviews` (`apps/api/src/routes/reviews.ts:31`)
6. FSRS `f.next()` computes new stability, difficulty, due date
7. Updates `cards` row + inserts `reviews` log row
8. Returns `next_due_at` to mobile; TanStack Query invalidates `['cards', 'due']`

**State Management:**

- Server state: TanStack Query with `queryKey: ['cards', 'due']` — single cache key shared across Home, Cards, and Review screens
- UI state: `useState` local to each screen component (wizard step, selected image, etc.)
- Theme: React Context (`ThemeContext`) in root layout, surface is `'light' | 'color' | 'oled'`
- No global client-side store (no Zustand, Redux, etc.)

## Key Abstractions

**pending_cards (two-phase commit):**

- Purpose: Survive network failures and long LLM generation. Card only enters `cards` table after user approval.
- State machine: `pending` → `generating` → `ready_for_review` → (approved: `discarded`) | (error: `discarded`)
- File: `packages/db/src/schema.ts:152`

**Content-addressed audio:**

- Purpose: Global dedup — same word + voice never synthesized twice
- Key: `SHA-256(text + provider + voiceId)` → 64-char hex
- Audio served: `GET /audio/:hash` validates hash format before filesystem lookup
- Files: `apps/api/src/lib/audio.ts`, `apps/mobile/src/providers/tts.ts`

**FSRS card state:**

- Purpose: Spaced repetition scheduling via Free Spaced Repetition Scheduler algorithm
- Library: `ts-fsrs` (npm)
- State enum: `new → learning → review` (lapses → `relearning`)
- Files: `apps/api/src/routes/reviews.ts`, `packages/db/src/schema.ts` (FSRS fields on `cards`)

**Prompt builders:**

- Purpose: Versioned, typed prompt construction with explicit Zod I/O schemas
- Pattern: exported object with `id`, `version`, `purpose`, `buildSystemPrompt()`, `buildUserPrompt(input)`
- File: `prompts/card-generation/extract-word-fields.ts`

## Entry Points

**Expo Mobile App:**

- Location: `apps/mobile/app/_layout.tsx`
- Triggers: Expo runtime initializes, mounts QueryClientProvider + ThemeContext + Stack navigator
- Responsibilities: Global providers, defines Stack screens (tabs, review modal, streak)

**API Server:**

- Location: `apps/api/src/index.ts`
- Triggers: `node src/index.ts` (or `tsx`)
- Responsibilities: Mounts 4 route groups, health check, starts `@hono/node-server` on `PORT` (default 3000)

**DB Seed:**

- Location: `apps/api/src/seed.ts`
- Triggers: Run manually via `node`/`tsx`
- Responsibilities: Inserts V0 hardcoded user row, idempotent via `onConflictDoNothing`

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop. Audio file I/O in `tts.ts` uses synchronous `fs.writeFileSync` — blocks the event loop during first-time synthesis
- **Global state:** `db` singleton in `packages/db/src/index.ts` (module-level Pool). `f = fsrs(...)` instantiated at module load in `apps/api/src/routes/reviews.ts:29`
- **Circular imports:** None detected
- **Cross-workspace provider import:** `apps/api/src/routes/generate.ts` imports `../../../mobile/src/providers/llm.js` — direct relative path crossing workspace boundaries instead of via the `@portuguese-app/mobile` package. Same pattern for `tts.ts` and `image-search.ts`
- **V0 single-user hardcode:** All DB queries use `V0_USER_ID` from `apps/api/src/lib/constants.ts`. Multi-user requires threading real auth throughout every route
- **Local audio storage:** `audio-cache/` directory on API server filesystem. Not viable for cloud/multi-instance deployment. ADR 0007 notes Supabase Storage as the target

## Anti-Patterns

### Provider files imported across workspace boundaries

**What happens:** `apps/api/src/routes/generate.ts` uses `import { extractWordFields } from '../../../mobile/src/providers/llm.js'` — a relative path traversal from `apps/api` into `apps/mobile`

**Why it's wrong:** Breaks workspace isolation; `apps/mobile` providers contain Node.js-specific filesystem code (`fs`, `path`) that is incompatible with React Native but gets pulled into the API bundle accidentally. TypeScript paths and package resolution both become fragile.

**Do this instead:** Move `llm.ts`, `tts.ts`, and `image-search.ts` to a shared package (e.g., `packages/providers/`) and import via `@portuguese-app/providers`. Reference: `packages/db/src/index.ts` shows the correct pattern.

### Synchronous filesystem write in async TTS handler

**What happens:** `apps/mobile/src/providers/tts.ts:53` calls `fs.writeFileSync(filePath, buffer)` inside an `async` function called from an API request handler

**Why it's wrong:** Blocks the Node.js event loop for the duration of the MP3 write, preventing all other requests from being served

**Do this instead:** Use `fs.promises.writeFile(filePath, buffer)` with `await`

## Error Handling

**Strategy:** Errors propagate as thrown exceptions caught by Hono's default error handler (returns HTTP 500). Validation errors return HTTP 400 with Zod-formatted messages. Business logic errors (not found, wrong state) return specific HTTP codes.

**Patterns:**

- Zod `safeParse` at all route entry points; return `400` with `error.format()` on failure
- `pending_cards` status set to `discarded` in the `catch` block of generate route to prevent orphaned rows
- Mobile `api.ts` throws `Error` with status code and path on non-OK responses — surfaces via TanStack Query `isError` / `mutation.error`
- Audio fetch failure in `ReviewScreen` is explicitly swallowed as non-fatal (try/catch with empty catch)

## Cross-Cutting Concerns

**Logging:** `console.log` only. Single startup message in `apps/api/src/index.ts`. No structured logging.
**Validation:** Zod schemas at API route boundaries. Prompt output also Zod-validated in `llm.ts` before returning to caller.
**Authentication:** V0 — none. `V0_USER_ID` hardcoded in `apps/api/src/lib/constants.ts`. ADR 0007 targets Supabase Auth at V1.

---

_Architecture analysis: 2026-05-18_
