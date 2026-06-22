# Codebase Structure

**Analysis Date:** 2026-05-18

## Directory Layout

```
LingoCards/                         # Monorepo root
├── apps/
│   ├── api/                        # Hono API server (Node.js)
│   │   └── src/
│   │       ├── index.ts            # Server entry point
│   │       ├── seed.ts             # V0 user seed script
│   │       ├── lib/
│   │       │   ├── audio.ts        # contentHash() helper
│   │       │   └── constants.ts    # V0_USER_ID
│   │       └── routes/
│   │           ├── audio.ts        # GET /audio/:hash
│   │           ├── cards.ts        # POST /cards, GET /cards/due
│   │           ├── generate.ts     # POST /generate
│   │           └── reviews.ts      # POST /reviews
│   └── mobile/                     # Expo React Native app
│       ├── app/                    # Expo Router file-based routes
│       │   ├── _layout.tsx         # Root layout (providers, Stack)
│       │   ├── (tabs)/             # Tab navigator group
│       │   │   ├── _layout.tsx     # Tab bar definition
│       │   │   ├── index.tsx       # Home screen
│       │   │   ├── add/index.tsx   # Add card wizard
│       │   │   ├── cards/index.tsx # Card library
│       │   │   └── settings/index.tsx
│       │   ├── review/index.tsx    # Full-screen review modal
│       │   └── streak/index.tsx    # Streak detail screen
│       ├── src/
│       │   ├── components/
│       │   │   └── StreakChip.tsx  # Animated streak badge
│       │   ├── lib/
│       │   │   ├── api.ts          # Typed fetch client
│       │   │   └── theme.ts        # Colors + ThemeContext
│       │   ├── providers/
│       │   │   ├── image-search.ts # Pexels API wrapper
│       │   │   ├── llm.ts          # OpenRouter/Gemini wrapper
│       │   │   └── tts.ts          # Narakeet TTS + cache
│       │   └── index.ts            # Package stub
│       ├── assets/images/          # App icons, splash
│       ├── app.json                # Expo config
│       ├── global.css              # NativeWind global styles
│       └── tailwind.config.js      # Tailwind/NativeWind config
├── packages/
│   └── db/                         # Shared DB package
│       ├── src/
│       │   ├── index.ts            # drizzle() client + re-exports
│       │   └── schema.ts           # All tables and enums
│       └── drizzle/
│           └── 0000_shiny_zombie.sql  # Initial migration
├── prompts/
│   └── card-generation/
│       └── extract-word-fields.ts  # LLM prompt builder + Zod schemas
├── data/
│   ├── frequency/                  # Portuguese frequency word lists
│   └── word-lists/                 # Curated word lists
├── scripts/
│   └── generate-card.ts           # CLI script for card generation
├── audio-cache/                    # Local MP3 store (gitignored, V0 only)
├── docs/                           # ADRs and design docs
├── .github/workflows/              # CI workflows
├── .husky/                         # Git hooks (lint-staged)
├── package.json                    # Root scripts, devDependencies
├── pnpm-workspace.yaml             # Workspace: apps/*, packages/*
├── tsconfig.json                   # Root TS config (references)
├── eslint.config.cjs               # ESLint flat config
├── vitest.config.ts                # Test runner config
└── AGENTS.md                       # AI agent guidance
```

## Directory Purposes

**`apps/api/src/routes/`:**

- Purpose: One file per API resource group
- Contains: Hono sub-routers, Zod input validation, DB queries, external service calls
- Key files: `generate.ts` (orchestrates LLM+TTS+Images), `reviews.ts` (FSRS scheduling)

**`apps/api/src/lib/`:**

- Purpose: Shared utilities used by multiple routes
- Contains: `audio.ts` (contentHash), `constants.ts` (V0_USER_ID)

**`apps/mobile/app/(tabs)/`:**

- Purpose: Expo Router tab group — each subdirectory maps to a tab
- Contains: Screen components with `export default` as required by Expo Router
- Key convention: `index.tsx` inside each subdirectory (e.g., `add/index.tsx`, not `add.tsx`)

**`apps/mobile/app/review/` and `apps/mobile/app/streak/`:**

- Purpose: Non-tab screens accessible via `router.push('/review')` and `router.push('/streak')`
- Review is presented as a `fullScreenModal`; Streak is a standard push

**`apps/mobile/src/lib/`:**

- Purpose: Foundational mobile utilities — API client and design tokens
- Key files: `api.ts` is the single point of contact between mobile and API; `theme.ts` holds all color values

**`apps/mobile/src/providers/`:**

- Purpose: Third-party API wrappers (LLM, TTS, image search)
- Note: Currently imported by `apps/api` via relative paths — intended to be extracted to a shared package

**`apps/mobile/src/components/`:**

- Purpose: Reusable React Native components
- Current contents: `StreakChip.tsx` only; grow this as shared UI elements are extracted from screens

**`packages/db/src/`:**

- Purpose: Single source of truth for DB schema and Drizzle client
- Consumed by: `apps/api` via `@portuguese-app/db` workspace import
- Key: `index.ts` exports both `db` and all schema tables/enums

**`packages/db/drizzle/`:**

- Purpose: Drizzle Kit migration output
- Generated: Yes (via `drizzle-kit generate`)
- Committed: Yes

**`prompts/card-generation/`:**

- Purpose: Versioned, Zod-typed LLM prompt builders
- Pattern: Each prompt file exports a prompt object + input/output Zod schemas + inferred types

**`data/`:**

- Purpose: Static Portuguese language data (frequency lists, word lists)
- Generated: No
- Committed: Yes

**`audio-cache/`:**

- Purpose: Local MP3 storage for TTS output (V0 stub for Supabase Storage)
- Generated: Yes (runtime)
- Committed: No (gitignored)

## Key File Locations

**Entry Points:**

- `apps/mobile/app/_layout.tsx`: Mobile app root — providers + Stack navigator
- `apps/api/src/index.ts`: API server — mounts routes and starts listener
- `apps/api/src/seed.ts`: Database seed script — run once to create V0 user

**Configuration:**

- `apps/mobile/app.json`: Expo app config (name, bundle IDs, icons)
- `apps/mobile/tailwind.config.js`: NativeWind Tailwind setup
- `packages/db/drizzle/`: Migration SQL files
- `pnpm-workspace.yaml`: Workspace package paths
- `tsconfig.json`: Root TypeScript project references

**Core Logic:**

- `packages/db/src/schema.ts`: Canonical data model (all tables and enums)
- `apps/api/src/routes/generate.ts`: Card generation orchestration
- `apps/api/src/routes/reviews.ts`: FSRS scheduling logic
- `apps/mobile/src/lib/api.ts`: All mobile→API communication
- `apps/mobile/src/providers/llm.ts`: LLM card extraction
- `prompts/card-generation/extract-word-fields.ts`: LLM prompt + schema

**Testing:**

- `vitest.config.ts`: Test runner config at repo root
- Tests not yet present in the repo (no `*.test.ts` or `*.spec.ts` files found)

## Naming Conventions

**Files:**

- Route screens: `index.tsx` inside a named directory (e.g., `add/index.tsx`)
- Components: PascalCase (e.g., `StreakChip.tsx`)
- Library/utility files: kebab-case (e.g., `image-search.ts`, `api.ts`)
- Route handlers: `{resource}.ts` (e.g., `cards.ts`, `reviews.ts`)

**Directories:**

- Expo Router groups: parentheses notation `(tabs)/`
- Packages: kebab-case (`packages/db`)
- Apps: lowercase (`apps/api`, `apps/mobile`)

**Variables/Functions:**

- DB column names: snake_case (Postgres convention, reflected in Drizzle schema)
- TypeScript: camelCase for functions/variables, PascalCase for types/interfaces/components
- Exported route objects: `{resource}Route` (e.g., `cardsRoute`, `generateRoute`)
- Zod schemas: `{Name}Schema` (e.g., `GenerateInput`, `WordFieldsOutputSchema`)

**Env vars:**

- API vars: `OPENROUTER_API_KEY`, `NARAKEET_API_KEY`, `PEXELS_API_KEY`, `DATABASE_URL`, `PORT`
- Mobile vars: `EXPO_PUBLIC_API_URL` (Expo public prefix required for client access)

## Where to Add New Code

**New API route:**

1. Create `apps/api/src/routes/{resource}.ts` — export a `new Hono()` named `{resource}Route`
2. Mount in `apps/api/src/index.ts` with `app.route('/{resource}', {resource}Route)`
3. Add corresponding typed method to `apps/mobile/src/lib/api.ts`

**New screen (tab):**

1. Create directory `apps/mobile/app/(tabs)/{name}/`
2. Add `index.tsx` with `export default function {Name}Screen()`
3. Register in `apps/mobile/app/(tabs)/_layout.tsx` as `<Tabs.Screen name="{name}/index" .../>`

**New screen (modal/push):**

1. Create `apps/mobile/app/{name}/index.tsx` with `export default`
2. Register in `apps/mobile/app/_layout.tsx` as `<Stack.Screen name="{name}/index" .../>`
3. Navigate with `router.push('/{name}')` from calling screen

**New reusable component:**

- Place in `apps/mobile/src/components/{ComponentName}.tsx`
- Export named export (not default) for components used across screens

**New DB table or column:**

1. Edit `packages/db/src/schema.ts`
2. Run `drizzle-kit generate` to create migration SQL in `packages/db/drizzle/`
3. Run migration against the database

**New external provider:**

- Place in `apps/mobile/src/providers/{name}.ts` (temporary — see ARCHITECTURE.md anti-patterns; extraction to `packages/providers/` is the correct long-term home)

**New LLM prompt:**

- Create `prompts/{use-case}/{prompt-name}.ts`
- Export: prompt object with `buildSystemPrompt()` + `buildUserPrompt()`, plus input/output Zod schemas and inferred types

**Shared utilities:**

- Pure utilities used by both mobile and API: create a new package under `packages/{name}/`
- API-only helpers: `apps/api/src/lib/{name}.ts`
- Mobile-only helpers: `apps/mobile/src/lib/{name}.ts`

## Special Directories

**`.planning/`:**

- Purpose: GSD planning artifacts (codebase maps, phase plans)
- Generated: By GSD commands
- Committed: Yes

**`.claude/`:**

- Purpose: Claude agent definitions and GSD command scripts
- Generated: By GSD installer
- Committed: Yes

**`audio-cache/`:**

- Purpose: Runtime TTS MP3 cache; V0 local storage stub
- Generated: At runtime by `tts.ts`
- Committed: No

**`packages/db/drizzle/`:**

- Purpose: Drizzle Kit migration output
- Generated: By `drizzle-kit generate`
- Committed: Yes

---

_Structure analysis: 2026-05-18_
