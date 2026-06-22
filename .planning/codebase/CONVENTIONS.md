# Coding Conventions

**Analysis Date:** 2026-05-18

## Naming Patterns

**Files:**

- Route modules: `camelCase` matching function name — `generate.ts`, `cards.ts`, `reviews.ts`
- React screen files: `index.tsx` inside a named directory (Expo Router convention)
- React component files: `PascalCase.tsx` — `StreakChip.tsx`
- Utility/lib files: `kebab-case.ts` — `image-search.ts`, `theme.ts`
- Constants files: `kebab-case.ts` — `constants.ts`, `audio.ts`
- DB schema: `schema.ts` in a `src/` directory

**Functions and variables:**

- Exported functions: `camelCase` — `extractWordFields`, `synthesize`, `searchImages`, `contentHash`
- React components (default exports): `PascalCase` — `AddScreen`, `HomeScreen`, `ReviewScreen`
- Sub-components within the same file: `PascalCase` — `InputStep`, `LoadingStep`, `PickImageStep`
- Local helper functions: `camelCase` — `getGreeting`, `getStreakState`, `cardCounts`, `filterCards`
- Hono route instances: `camelCase` + `Route` suffix — `generateRoute`, `cardsRoute`, `reviewsRoute`
- Mutation/query handlers: `camelCase` — `generateMutation`, `approveMutation`, `reviewMutation`

**Types and interfaces:**

- Zod schema objects: `PascalCase` + `Schema` suffix — `GenerateInput`, `WordFieldsOutputSchema`, `TTSResultSchema`, `PexelsResponseSchema`
- TypeScript types inferred from Zod: `PascalCase` — `TTSResult`, `ImageResult`, `WordFieldsOutput`
- React prop interfaces: `interface Props` (single-component files) or inline object type in function signature
- Union/enum types: `PascalCase` — `Mode`, `Step`, `Phase`, `Filter`, `Surface`, `StreakState`

**Database:**

- Table names: `snake_case` — `pending_cards`, `audio_clips`, `lemmas`
- Column names: `snake_case` — `input_text`, `card_kind`, `draft_json`
- Drizzle enum exports: `camelCase` + `Enum` suffix — `genderEnum`, `cardKindEnum`
- Exported table variables: `snake_case` matching table name — `pending_cards`, `audio_clips`

**Constants:**

- Module-level constants: `SCREAMING_SNAKE_CASE` — `V0_USER_ID`, `RATING_MAP`, `STATE_MAP`, `AUDIO_CACHE_DIR`, `ENDPOINT`, `MODEL`, `PROVIDER`, `VOICE_ID`

**React Query keys:**

- String arrays: `['cards', 'due']` — kebab-friendly strings, hierarchical

## Code Style

**Formatting (Prettier):**

- Single quotes for strings: `'word'` not `"word"`
- Semicolons: required
- Trailing commas: `"all"` (ES5+ compatible)
- Print width: 100 characters
- Tab width: 2 spaces

**Linting (ESLint + typescript-eslint):**

- `@typescript-eslint/no-unused-vars`: error, underscore-prefixed args ignored (`_`)
- `@typescript-eslint/no-explicit-any`: error — `any` is banned; cast to `unknown` then narrow
- `prettier` rules integrated via `eslint-config-prettier`

**TypeScript (strict mode):**

- `strict: true` + `noUncheckedIndexedAccess: true` on all packages
- No `any` — use `unknown` with narrowing or `z.infer<>` for external data
- Environment variables accessed as `process.env['KEY']` (bracket notation required by TS strict)
- Type assertions used sparingly — prefer Zod `.parse()` or `.safeParse()` over `as`

## Import Organization

**Order (consistent across files):**

1. External packages — `react`, `react-native`, `hono`, `zod`, `drizzle-orm`
2. Internal workspace packages — `@portuguese-app/db`
3. Local relative imports — `../lib/constants.js`, `./routes/cards.js`

**File extensions:**

- API (`apps/api`): uses `.js` extension in imports even for TypeScript source (`import ... from './routes/cards.js'`) — required for Node ESM
- Mobile (`apps/mobile`): uses extensionless path aliases (`@/src/lib/api`, `@/src/components/StreakChip`)

**Path Aliases:**

- Mobile only: `@/*` maps to the mobile app root (`apps/mobile/`) — configured in `tsconfig.json`
- No alias in API — uses relative paths with `.js` extension

## Validation Pattern

**Zod is used for all external data boundaries:**

```typescript
// API route input validation
const GenerateInput = z.object({
  input_text: z.string().min(1),
  kind: z.enum(['word', 'sentence']),
});
const parsed = GenerateInput.safeParse(body);
if (!parsed.success) return c.json({ error: parsed.error.format() }, 400);
```

```typescript
// External API response validation
const result = WordFieldsOutputSchema.safeParse(parsed);
if (!result.success) {
  throw new Error(
    `LLM output failed Zod validation:\n${JSON.stringify(result.error.issues, null, 2)}`,
  );
}
return result.data;
```

```typescript
// TTS result wrapping
return TTSResultSchema.parse({ audioUrl: filePath, durationMs: estimateDurationMs(size) });
```

- `safeParse` for user input (return 400 on failure)
- `parse` (throws) for internal/trusted data that must match schema
- `z.infer<typeof Schema>` to derive TypeScript types — avoids duplicating type definitions

## Error Handling

**API routes (Hono):**

- Validation errors: `c.json({ error: parsed.error.format() }, 400)` — structured Zod format
- Not-found: `c.json({ error: 'X not found' }, 404)`
- State conflicts: `c.json({ error: '...' }, 409)`
- Unrecoverable: `throw err` — Hono propagates as 500
- Long operations: wrap in try/catch, mark DB record as `'discarded'` on failure before re-throwing

```typescript
// Pattern in generate.ts
try {
  // ... do work
} catch (err) {
  await db
    .update(pending_cards)
    .set({ status: 'discarded' })
    .where(eq(pending_cards.id, pending.id));
  throw err;
}
```

**Mobile (React Native):**

- TanStack Query mutations: errors surfaced via `mutation.error?.message` in JSX
- Non-fatal failures silently caught with comment: `// audio failure is non-fatal`
- No global error boundary — each screen handles its own error state inline

**External API calls:**

- All external fetches check `!response.ok` and throw with status + body:
  ```typescript
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
  }
  ```

## Logging

- No structured logging library — `console.log` used only at server startup:
  ```typescript
  serve({ fetch: app.fetch, port }, () => {
    console.log(`API running on http://localhost:${port}`);
  });
  ```
- No request-level logging in route handlers
- Errors are thrown (not logged) and propagate to the framework

## Comments

**Inline JSDoc-style block comments for non-obvious decisions:**

```typescript
/** Hardcoded single user at V0. Real auth via Supabase Auth lands at V1 (ADR 0007). */
export const V0_USER_ID = '...';
```

**ADR references for architectural decisions:**

- Comments reference `ADR 0006`, `ADR 0007` etc. to link to `docs/decisions/`
- Format: `// Comment text (ADR XXXX)`

**Inline `// V0:` prefix for known stubs/shortcuts:**

```tsx
// V0: streak hardcoded — no user endpoint yet
const streakCount = 1;
```

**Section dividers in large files using `─` box-drawing characters:**

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────
// ─── Tables ───────────────────────────────────────────────────────────────────
```

**No JSDoc on most functions** — types alone serve as documentation; comments reserved for non-obvious behavior.

## Function Design

**Size:** Functions kept small. Sub-components extracted when JSX grows beyond a screen's "phase." Example: `AddScreen` delegates to `InputStep`, `LoadingStep`, `PickImageStep`, `PickSentenceStep`, `ReviewStep`, `SavedStep` — all in the same file.

**Parameters:** Props are typed via inline destructured object with explicit type annotation. No optional chaining for required values.

**Return values:**

- Route handlers always return `c.json(...)` or throw
- Async functions return `Promise<T>` where `T` is always explicitly declared or inferred via Zod

## Module Design

**Exports:**

- API routes: named export of Hono instance — `export const cardsRoute = new Hono()`
- Providers: named function exports — `export async function synthesize(...)`
- DB package: re-exports everything from schema via `export * from './schema.js'`
- Mobile `src/`: thin barrel at `src/index.ts` (stub only — actual imports are direct)
- Zod schemas and inferred types always co-located and both exported

**Barrel Files:**

- `packages/db/src/index.ts` re-exports schema for workspace consumers
- `apps/mobile/src/index.ts` is a stub (no real barrel exports in mobile)
- No barrel index files in `apps/api/src/` — each module imported directly with `.js` extension

## NativeWind (Tailwind in React Native)

**All styling via NativeWind className:**

```tsx
<SafeAreaView className="flex-1 bg-white">
<Text className="text-content text-2xl font-bold">
<TouchableOpacity className="bg-brand rounded-2xl py-4 items-center">
```

**Style prop used only for dynamic values that cannot be expressed as static classes:**

```tsx
style={{ opacity: inputText.trim() ? 1 : 0.4 }}
style={{ borderColor: isSelected ? '#1F3494' : '#E5E5E5' }}
```

**Custom Tailwind tokens** (defined in `apps/mobile/tailwind.config.js`):

- `brand` = `#1F3494` (primary blue)
- `brand-lifted` = `#5A8FD4`
- `accent` = `#F0BF38` (gold)
- `content` = `#0F2547` (body text)
- `muted` = `#5A6995` (secondary text)
- `gender-fem` = `#E8658A`, `gender-masc` = `#1F3494`, `gender-common` = `#F0BF38`

**Hardcoded hex strings** used in `style={}` for colors not mappable to static classes (gradients, animated values, inline conditional logic). This is the accepted pattern when NativeWind cannot evaluate the class at build time.

## Commit Message Convention

Conventional commits enforced via commitlint + husky:

- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `style`, `build`
- Subject case: unconstrained (no `subject-case` rule enforced)
- Header max length: 100 characters

---

_Convention analysis: 2026-05-18_
