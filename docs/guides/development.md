<!-- generated-by: gsd-doc-writer -->

# Development

This guide covers the day-to-day development workflow: running the stack locally, the available make targets, code conventions, where to put new code, database schema changes, linting, and the PR process.

For initial setup and prerequisites, see [Getting Started](getting-started.md). For environment variables and config files, see [Configuration](configuration.md).

## Local Setup

After completing the Getting Started steps (clone, `make install`, `.env` configured), the development flow uses two terminals:

**Terminal 1 — API server:**

```bash
make api
# Starts the Hono server on http://localhost:3000 via: cd apps/api && corepack pnpm run dev
```

The API loads environment variables from the root `.env` file at startup via `tsx --env-file ../../.env`. It does not watch for file changes — restart the process manually after editing API source files.

**Terminal 2 — Expo / Metro bundler:**

```bash
make mobile
# Starts Metro bundler via: cd apps/mobile && corepack pnpm start
```

Metro provides Fast Refresh for the React Native mobile app — saving a file in `apps/mobile/` reloads the affected screen on your device without a full restart.

> **LAN access:** The mobile app must reach the API over your local network. Pass the LAN IP of your dev machine when starting Metro:
>
> ```bash
> EXPO_PUBLIC_API_URL=http://192.168.1.x:3000 make mobile
> ```

## Build and Dev Commands

All common tasks are available as Makefile targets. Run `make help` for the full list.

| Command                 | What it does                                                      |
| ----------------------- | ----------------------------------------------------------------- |
| `make install`          | Install all workspace dependencies via pnpm                       |
| `make api`              | Start the Hono API server (port 3000, no watch)                   |
| `make mobile`           | Start Expo / Metro bundler (Fast Refresh)                         |
| `make api-seed`         | Insert the hardcoded V0 user row (run once after first migration) |
| `make test`             | Run unit tests with Vitest                                        |
| `make typecheck`        | `tsc --noEmit` across all workspaces in parallel                  |
| `make lint`             | ESLint + markdownlint + cspell                                    |
| `make format`           | Prettier write pass over the whole repo                           |
| `make check`            | `typecheck` + `lint` + `test` (same as CI)                        |
| `make db-generate`      | Generate SQL migration from schema changes                        |
| `make db-migrate`       | Apply pending migrations to the Supabase database                 |
| `make db-studio`        | Open Drizzle Studio browser UI                                    |
| `make ingest-frequency` | Rebuild the frequency list from the corpus                        |
| `make prewarm-audio`    | Generate TTS audio for top-N high-frequency words                 |
| `make validate-prompts` | Check prompt files match their declared input/output schemas      |
| `make clean`            | Remove `node_modules`, `dist`, `build`, `.expo`, `coverage`       |

The `make check` target runs the same sequence as CI. Run it before opening a PR.

Underlying pnpm scripts are defined in the root `package.json` under `scripts` and can be run directly with `pnpm <script>` from the repo root when you need finer control (e.g., `pnpm test:coverage` for a coverage report).

## Code Conventions

Style enforcement is automatic — just run `make lint` and `make format`. The conventions below cover judgment calls that tooling cannot catch.

### Naming

| Kind                      | Pattern                              | Example                         |
| ------------------------- | ------------------------------------ | ------------------------------- |
| API route files           | `camelCase` matching function name   | `cards.ts`, `reviews.ts`        |
| Mobile screens            | `index.tsx` inside a named directory | `add/index.tsx`                 |
| Components                | `PascalCase.tsx`                     | `StreakChip.tsx`                |
| Utility / lib files       | `kebab-case.ts`                      | `image-search.ts`, `theme.ts`   |
| Hono route instances      | `camelCase` + `Route` suffix         | `cardsRoute`, `generateRoute`   |
| Zod schema objects        | `PascalCase` + `Schema` suffix       | `WordFieldsOutputSchema`        |
| TypeScript types from Zod | `PascalCase`                         | `TTSResult`, `WordFieldsOutput` |
| DB table exports          | `snake_case` matching table name     | `pending_cards`, `audio_clips`  |
| Module constants          | `SCREAMING_SNAKE_CASE`               | `V0_USER_ID`, `RATING_MAP`      |

### TypeScript

- **No `any`** — use `unknown` with narrowing or `z.infer<typeof Schema>` for external data.
- **No `as` casts or `// @ts-ignore`** without an explanatory comment.
- Environment variables accessed via bracket notation: `process.env['KEY']` (required by TS strict).
- `strict: true` and `noUncheckedIndexedAccess: true` are on in all packages. Array index access returns `T | undefined` — handle it.

### Validation pattern

All external data boundaries use Zod:

```typescript
// User input: safeParse → return 400 on failure
const parsed = GenerateInput.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);

// Trusted internal data: parse() throws loudly — no silent fallback
const result = WordFieldsOutputSchema.parse(llmOutput);
```

LLM outputs must always pass a Zod schema before use in app code. Malformed LLM JSON throws — never default silently.

### Comments

- Comment only the **why**, not the what. Default is no comment.
- Reference ADRs inline: `// ... (ADR 0006)`.
- Mark V0 shortcuts with a `// V0:` prefix so they are easy to find later.

### Discriminated unions

Prefer discriminated unions over boolean flags. The `card_kind` field (`'word' | 'sentence'`) is the canonical example — one table, one discriminator, two shapes.

### Import order

1. External packages (`react`, `hono`, `zod`, `drizzle-orm`)
2. Internal workspace packages (`@portuguese-app/db`)
3. Local relative imports

API imports use `.js` extensions (required for Node ESM). Mobile imports use extensionless `@/*` path aliases.

## Adding New Features

### New API route

1. Create `apps/api/src/routes/{resource}.ts` — export a `new Hono()` instance named `{resource}Route`.
2. Mount it in `apps/api/src/index.ts`:

   ```typescript
   import { {resource}Route } from './routes/{resource}.js';
   app.route('/{resource}', {resource}Route);
   ```

3. Add a typed function for it in `apps/mobile/src/lib/api.ts` so the mobile app can call it.

### New tab screen (mobile)

1. Create `apps/mobile/app/(tabs)/{name}/index.tsx` with `export default function {Name}Screen()`.
2. Register the screen in `apps/mobile/app/(tabs)/_layout.tsx` as `<Tabs.Screen name="{name}/index" ... />`.

### New modal or push screen (mobile)

1. Create `apps/mobile/app/{name}/index.tsx` with `export default`.
2. Register in `apps/mobile/app/_layout.tsx` as `<Stack.Screen name="{name}/index" ... />`.
3. Navigate to it with `router.push('/{name}')`.

For **dynamic route segments** (e.g., a detail screen keyed by ID):

1. Create `apps/mobile/app/{name}/[id].tsx` with `export default`. Read the param with `useLocalSearchParams<{ id: string }>()`.
2. Register in `apps/mobile/app/_layout.tsx` as `<Stack.Screen name="{name}/[id]" ... />`.
3. Navigate with `router.push('/{name}/123')`.

The card detail screen (`apps/mobile/app/cards/[id].tsx`, registered as `cards/[id]`) is the canonical example.

### New reusable component

Place in `apps/mobile/src/components/{ComponentName}.tsx`. Use a named export (not default) for components shared across screens.

### New LLM prompt

Create `prompts/{use-case}/{prompt-name}.ts`. Export a prompt object with `buildSystemPrompt()` and `buildUserPrompt()` functions, plus input/output Zod schemas and their inferred types — all co-located in the same file.

### Shared utilities

- Used by both mobile and API: create a new package under `packages/{name}/`.
- API-only helpers: `apps/api/src/lib/{name}.ts`.
- Mobile-only helpers: `apps/mobile/src/lib/{name}.ts`.

### New external provider

Before adding a new external service, file an issue with the `adr` label and wait for review. New providers require an ADR in `docs/decisions/`. Implementation goes in `apps/mobile/src/providers/{name}.ts`.

## Database Changes

The schema is the single source of truth. DB types and migrations both derive from it — never edit the generated SQL directly.

**Workflow for schema changes:**

1. Edit `packages/db/src/schema.ts`.
2. Generate the migration:

   ```bash
   make db-generate
   # Writes a new SQL file to packages/db/drizzle/
   ```

3. Review the generated SQL in `packages/db/drizzle/`.
4. Apply the migration:

   ```bash
   make db-migrate
   # Requires DATABASE_URL in .env
   ```

5. Commit both `schema.ts` and the generated migration file.

> Schema changes that affect existing data require an ADR before merging. If a change drops or renames columns, document the migration strategy in `docs/decisions/`.

To browse the live database interactively:

```bash
make db-studio
# Opens Drizzle Studio at http://local.drizzle.studio
```

## Linting and Formatting

Three tools cover different surface areas:

| Tool                       | Scope                              | Command                          |
| -------------------------- | ---------------------------------- | -------------------------------- |
| ESLint + typescript-eslint | TypeScript/TSX files               | `make lint` (or `pnpm lint`)     |
| Prettier                   | All files (TS, JS, JSON, YAML, MD) | `make format` (or `pnpm format`) |
| markdownlint               | Markdown files                     | Included in `make lint`          |
| cspell                     | Spelling in TS/TSX/MD              | Included in `make lint`          |

Key ESLint rules: `@typescript-eslint/no-explicit-any` (error), `@typescript-eslint/no-unused-vars` (error, underscore-prefix exception). `eslint-config-prettier` disables rules that conflict with Prettier so both can run together.

Pre-commit hooks (via Husky + lint-staged) run ESLint and Prettier automatically on staged files. The hook runs `make pre-commit` which calls `pnpm exec lint-staged`.

**Format check (without writing):**

```bash
pnpm format:check
```

This is what CI runs — it will fail the build if any file differs from what Prettier would write.

## Type Checking

```bash
make typecheck
# Runs tsc --noEmit across all workspaces in parallel
```

All workspaces (`apps/api`, `apps/mobile`, `packages/db`) have their own `tsconfig.json` and `typecheck` script. The root command runs all of them via `pnpm -r --parallel --if-present run typecheck`.

TypeScript is configured in strict mode with `noUncheckedIndexedAccess`. There is no emit step — the API runs via `tsx` directly from source, and the mobile app is bundled by Metro.

## Branch Conventions and PR Process

- Branch off `main`, PR back to `main`.
- Branch naming is not formally enforced — use descriptive names that reflect the feature or fix.
- Commit messages follow **Conventional Commits** enforced by commitlint:
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `style`, `build`
  - Max header length: 100 characters
  - Explain _why_, not just _what_

**Before opening a PR:**

- Run `make check` (typecheck + lint + test) — CI runs the same sequence.
- CI also runs `pnpm format:check`; run `make format` locally if you have formatting differences.
- For architectural changes (new dependency, schema change affecting existing data, new external service, folder restructure), write an ADR in `docs/decisions/` first.

**Using `gh` for GitHub operations:**

The `gh` CLI is not pre-authenticated in the sandbox. Load the token from `.env` before any `gh` call:

```bash
export GH_TOKEN=$(grep '^GH_TOKEN=' .env | cut -d= -f2-)
```

Then use `gh issue create`, `gh pr create`, etc. as normal. Never commit the token value.
