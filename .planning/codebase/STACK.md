# Technology Stack

**Analysis Date:** 2026-05-18

## Languages

**Primary:**

- TypeScript 5.9.3 - All source code across all packages (strict mode + `noUncheckedIndexedAccess`)

**Secondary:**

- JavaScript (CJS) - Config files only: `babel.config.cjs`, `eslint.config.cjs`, `metro.config.cjs`, `commitlint.config.cjs`

## Runtime

**Environment:**

- Node.js >=22 (pinned to major 22 via `.nvmrc`)

**Package Manager:**

- pnpm 11.1.2 (via Corepack — `corepack enable` required)
- Lockfile: `pnpm-lock.yaml` (present, committed)
- Workspace config: `pnpm-workspace.yaml` — includes `apps/*` and `packages/*`

## Frameworks

**Mobile (React Native):**

- Expo SDK 54.0.33 — managed workflow, React Native 0.81.5
- Expo Router 6.0.23 — file-based routing (`apps/mobile/app/` directory)
- React 19.1.0 — with new architecture enabled (`newArchEnabled: true` in `app.json`)
- NativeWind 4.2.4 — Tailwind CSS for React Native styling
- TanStack Query 5.100.10 — async data fetching and caching
- React Navigation 7.x — bottom tabs + native stack navigation

**API:**

- Hono 4.7.10 — TypeScript-first HTTP framework (ADR 0008)
- `@hono/node-server` 1.13.7 — Node.js adapter for Hono

**Database / ORM:**

- Drizzle ORM 0.44.0 — schema-as-source-of-truth for both migrations and TypeScript types
- Drizzle Kit 0.30.0 — migration generation and Drizzle Studio (`packages/db/drizzle.config.ts`)

**Testing:**

- Vitest 3.x — test runner, configured at root (`vitest.config.ts`)
- `@vitest/coverage-v8` 3.x — V8 coverage provider

**Build/Dev:**

- Metro bundler — React Native bundler (configured via `apps/mobile/metro.config.cjs`)
- Babel with `babel-preset-expo` + NativeWind JSX source (`apps/mobile/babel.config.cjs`)
- tsx 4.x — TypeScript execution for API dev server and scripts

## Key Dependencies

**Critical:**

- `ts-fsrs` 5.3.2 — FSRS spaced repetition scheduler (ADR 0006); used in both `apps/api` and `apps/mobile`
- `zod` 4.4.3 — schema validation for all LLM output, API request bodies, and TTS results; present in root, mobile, and api packages
- `drizzle-orm` 0.44.0 — all DB access; single source of truth for types
- `pg` 8.13.0 — PostgreSQL driver (TCP, standard pg — not Supabase JS client per ADR 0007)

**Infrastructure:**

- `expo-av` 16.0.8 — audio playback of TTS-generated MP3s in the mobile app
- `expo-haptics` 15.0.8 — haptic feedback in review UI
- `react-native-reanimated` 4.1.1 — animations for card flip and transitions
- `react-native-gesture-handler` 2.28.0 — swipe gestures in review flow
- `@expo/vector-icons` 15.0.3 — icon set

## Configuration

**TypeScript:**

- Root `tsconfig.json`: `target: ES2022`, `strict: true`, `noUncheckedIndexedAccess: true`, `module: ESNext`, `moduleResolution: bundler`
- Each package has its own `tsconfig.json` extending the root

**Linting/Formatting:**

- ESLint 9.x via `eslint.config.cjs` — `typescript-eslint` + `eslint-config-prettier`; `no-explicit-any` is an error
- Prettier 3.x — formats TS, JS, JSON, YAML, MD
- Markdownlint CLI 0.44 — lints markdown files
- cspell 8.x — spell checking on `.ts`, `.tsx`, `.md`
- Commitlint + conventional commits (`commitlint.config.cjs`)
- Husky 9.x + lint-staged 15.x — pre-commit hooks running ESLint + Prettier

**Environment:**

- `.env` at repo root; loaded by API via `--env-file ../../.env` in the dev script
- `EXPO_PUBLIC_API_URL` — mobile app API base URL (prefixed for Expo public exposure)
- Required: `DATABASE_URL`, `OPENROUTER_API_KEY`, `NARAKEET_API_KEY`, `PEXELS_API_KEY`
- Example: `.env.example` (committed, no secrets)

**Build:**

- `app.json` (`apps/mobile/`) — Expo app config: bundle IDs `com.consono.app` (iOS + Android), scheme `consono`, `newArchEnabled: true`
- `tailwind.config.js` (`apps/mobile/`) — NativeWind preset with custom brand tokens

## Monorepo Structure

```
apps/
  mobile/   # @portuguese-app/mobile — Expo React Native app
  api/      # @portuguese-app/api — Hono Node.js API server
packages/
  db/       # @portuguese-app/db — Drizzle schema + pg client (workspace dep)
```

`packages/db` is referenced as `workspace:*` from `apps/api`. The `api` imports provider modules
directly from `apps/mobile/src/providers/` (noted in AGENTS.md as a historical quirk — do not
move without updating all imports).

## Platform Requirements

**Development:**

- Node.js 22.x (`corepack enable` required for pnpm via Corepack)
- Expo Go app or iOS/Android simulator for mobile
- Postgres (Supabase project or local) with `DATABASE_URL` set

**Production:**

- Mobile: Expo build pipeline targeting iOS (`com.consono.app`) and Android (`com.consono.app`)
- API: Node.js 22.x server (Hono `fetch`-based — portable to edge runtimes in future)
- Database: Supabase-hosted PostgreSQL (free tier at V0; see ADR 0007)

---

_Stack analysis: 2026-05-18_
