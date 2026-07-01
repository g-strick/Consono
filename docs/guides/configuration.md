<!-- generated-by: gsd-doc-writer -->

# Configuration

This guide covers all environment variables, config files, and runtime options for the LingoCards monorepo. The project has two server-side workspaces that need configuration (`apps/api` and `packages/db`) and one mobile workspace (`apps/mobile`) that reads a single optional variable at build time.

## Environment Variables

All environment variables live in a single `.env` file at the **monorepo root**. The API server loads it at startup via `tsx --env-file ../../.env`, and Drizzle Kit loads it via `dotenv` when running database commands. Copy the example file to get started:

```bash
cp .env.example .env
```

### Variable Reference

| Variable              | Required                     | Default       | Description                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | **Required**                 | —             | PostgreSQL connection string. Loaded at module startup; the process throws immediately if absent.                                                                                                                                                                                                                                             |
| `NARAKEET_API_KEY`    | Required for TTS             | —             | API key for the Narakeet text-to-speech service. Throws at request time when audio synthesis is attempted.                                                                                                                                                                                                                                    |
| `OPENROUTER_API_KEY`  | Required for card generation | —             | API key for OpenRouter (routes to Gemini 2.5 Flash Lite). Throws at request time when card generation is called.                                                                                                                                                                                                                              |
| `PEXELS_API_KEY`      | Required for card generation | —             | API key for the Pexels image search API. Throws at request time when image search is called.                                                                                                                                                                                                                                                  |
| `EXPO_PUBLIC_API_URL` | Optional                     | Auto-resolved | Override for the mobile app's API base URL. Read at module init in `apps/mobile/src/lib/api.ts`. When absent in development, the app resolves the LAN IP from Expo's `hostUri` automatically (falls back to `http://localhost:3000`). For production builds, set this before running `eas build` or via your CI/CD platform's secret manager. |
| `PORT`                | Optional                     | `3000`        | Port the Hono API server listens on.                                                                                                                                                                                                                                                                                                          |

### Failure modes

`DATABASE_URL` is the only variable that causes an immediate startup failure. The `@portuguese-app/db` package throws `Error: DATABASE_URL is not set` at module initialization, which means the API process will exit before serving any requests.

The three API keys (`NARAKEET_API_KEY`, `OPENROUTER_API_KEY`, `PEXELS_API_KEY`) throw only when their respective provider functions are called — the server starts successfully without them but specific routes will error at runtime.

### Where secrets run

All five secret variables (`DATABASE_URL`, `NARAKEET_API_KEY`, `OPENROUTER_API_KEY`, `PEXELS_API_KEY`, `EXPO_PUBLIC_API_URL`) are consumed by the **API server** process. The mobile app provider files (`apps/mobile/src/providers/`) are imported directly by the API routes and execute server-side — do not embed these keys in the Expo mobile bundle.

### Note on `NARAKEET_VOICE_ID`

`.env.example` includes a `NARAKEET_VOICE_ID` entry, but it is not read by any code. The voice is hardcoded to `'felipe'` in `apps/mobile/src/providers/tts.ts`, `apps/api/src/lib/audio.ts`, and the route handlers. This variable has no effect and can be omitted from your `.env`.

## Database Connection String

The `DATABASE_URL` value must be a standard PostgreSQL URI in transaction-mode format. The example value in `.env.example` shows the Supabase pattern:

```
postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
```

<!-- VERIFY: confirm Supabase project ref, host, and password for the target deployment -->

The `packages/db` package uses the standard `pg` driver over TCP (not the Supabase JS client), so any PostgreSQL host (Neon, Railway, RDS, self-hosted) is compatible as long as the URI is valid. See `docs/decisions/0007-supabase-postgres-host.md` for the rationale.

## Per-Environment Configuration

There is one root `.env` file shared across all commands. The project does not use `.env.development`, `.env.production`, or `.env.test` files. All three consumers resolve the same root file:

- API server: `tsx --env-file ../../.env src/index.ts` (via `apps/api/package.json` dev script)
- Drizzle Kit: `config({ path: '../../.env' })` in `packages/db/drizzle.config.ts` (run from `packages/db/`)
- Database commands: invoked via `make db-*`, which `cd`s into `packages/db/` first so the relative path resolves correctly

For production deployments, inject variables through the hosting platform's secret manager rather than shipping a `.env` file. <!-- VERIFY: production deployment platform and secret injection mechanism -->

## Config Files

### `apps/mobile/app.json`

The Expo configuration file. Key values:

| Key                         | Value                | Notes                                 |
| --------------------------- | -------------------- | ------------------------------------- |
| `expo.name`                 | `LingoCards`         | Display name                          |
| `expo.slug`                 | `lingocards`         | URL slug for Expo services            |
| `expo.scheme`               | `lingocards`         | Deep-link URL scheme                  |
| `expo.ios.bundleIdentifier` | `com.lingocards.app` | iOS bundle ID                         |
| `expo.android.package`      | `com.lingocards.app` | Android package name                  |
| `expo.newArchEnabled`       | `true`               | React Native new architecture enabled |
| `expo.userInterfaceStyle`   | `light`              | Light mode only at V0                 |

This file is static — no runtime substitution occurs. Build-time Expo variables (`EXPO_PUBLIC_*`) are handled by Expo's environment variable system, separate from `app.json`.

### `apps/mobile/tailwind.config.js`

NativeWind (Tailwind for React Native) configuration. Defines the design token palette used across all screens.

**Color tokens:**

| Token           | Value     | Purpose                         |
| --------------- | --------- | ------------------------------- |
| `brand`         | `#1F3494` | Primary brand blue              |
| `brand-deep`    | `#142468` | Deeper brand blue               |
| `brand-fill`    | `#2E5BC8` | Interactive fills               |
| `brand-tint`    | `#EFF3FB` | Light brand backgrounds         |
| `brand-tint-2`  | `#E8EEF7` | Secondary light brand surface   |
| `brand-light`   | `#5A8FD4` | Mid-range brand blue            |
| `brand-soft`    | `#7AA0DD` | Soft brand blue                 |
| `heat-0`        | `#EFF3FB` | Heatmap level 0 (no activity)   |
| `heat-1`        | `#A5BFE8` | Heatmap level 1                 |
| `heat-2`        | `#5A8FD4` | Heatmap level 2                 |
| `heat-3`        | `#2E5BC8` | Heatmap level 3 (high activity) |
| `accent`        | `#E8B838` | Accent / highlight color        |
| `accent-deep`   | `#C99A1F` | Deep accent                     |
| `again`         | `#C84A40` | "Again" rating — red            |
| `oled`          | `#000000` | OLED black surface              |
| `oled-elevated` | `#0A1422` | Elevated OLED surface           |
| `paper`         | `#FFFFFF` | Default light surface           |
| `paper-soft`    | `#F7F7F8` | Soft paper surface              |
| `paper-soft-2`  | `#EFEFF1` | Secondary soft paper surface    |
| `gray-rule`     | `#D5D5D5` | Divider / rule color            |
| `gender-fem`    | `#B43A6C` | Feminine gender indicator       |
| `gender-masc`   | `#1F3494` | Masculine gender indicator      |
| `gender-common` | `#C99A1F` | Common gender indicator         |

**Font family tokens:**

| Token            | Font                   |
| ---------------- | ---------------------- |
| `geist`          | Geist (regular)        |
| `geist-medium`   | Geist_500Medium        |
| `geist-semibold` | Geist_600SemiBold      |
| `geist-bold`     | Geist_700Bold          |
| `mono`           | GeistMono (regular)    |
| `mono-medium`    | GeistMono_500Medium    |
| `serif`          | InstrumentSerif        |
| `serif-italic`   | InstrumentSerif_Italic |

Content paths scan `./app/**` and `./src/**`. No changes to this file are needed for environment configuration.

### `packages/db/drizzle.config.ts`

Controls the Drizzle Kit CLI (schema generation and migrations). Reads `DATABASE_URL` from the root `.env`. Key settings:

```ts
{
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
}
```

Migration artifacts are written to `packages/db/drizzle/`. Run database commands via the Makefile targets (`make db-generate`, `make db-migrate`, `make db-studio`) rather than calling Drizzle Kit directly, since the Makefile `cd`s into `packages/db/` first to ensure the dotenv path resolves correctly.

### Root `tsconfig.json`

Shared TypeScript compiler options inherited by workspace packages. Key flags:

| Option                     | Value     | Effect                                                            |
| -------------------------- | --------- | ----------------------------------------------------------------- |
| `strict`                   | `true`    | Full strict mode                                                  |
| `noUncheckedIndexedAccess` | `true`    | Array/object index access returns `T \| undefined`                |
| `moduleResolution`         | `bundler` | Bundler-style resolution (no `.js` extension required in imports) |
| `noEmit`                   | `true`    | Type-check only; no compiled output                               |

### `vitest.config.ts`

Test runner configuration at the monorepo root. Test files are discovered from:

- `apps/*/tests/**/*.{test,spec}.ts`
- `apps/*/src/**/*.{test,spec}.ts`

Coverage is provided by `@vitest/coverage-v8`. No coverage thresholds are configured.

## API Server Runtime Options

The Hono API server (`apps/api`) has one runtime option beyond the env vars listed above:

| Option      | Env var | Default | Notes                                                                      |
| ----------- | ------- | ------- | -------------------------------------------------------------------------- |
| Listen port | `PORT`  | `3000`  | Parsed as `Number(process.env['PORT'] ?? 3000)` in `apps/api/src/index.ts` |

The audio cache is stored on disk at `audio-cache/` relative to the API server's working directory (resolved via `process.cwd()`). This path is hardcoded and not configurable at V0.

## LLM Provider Settings

The LLM provider (`apps/mobile/src/providers/llm.ts`) uses hardcoded constants:

| Setting     | Value                                   | Location |
| ----------- | --------------------------------------- | -------- |
| Endpoint    | `https://openrouter.ai/api/v1/messages` | `llm.ts` |
| Model       | `google/gemini-2.5-flash-lite`          | `llm.ts` |
| Temperature | `0.2`                                   | `llm.ts` |
| Max tokens  | `1024`                                  | `llm.ts` |

These are not configurable via environment variables at V0. See `docs/decisions/0004-tts-narakeet.md` for TTS provider rationale and `docs/decisions/0005-provider-boundaries.md` for provider boundary decisions.
