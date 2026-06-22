# Testing Patterns

**Analysis Date:** 2026-05-18

## Test Framework

**Runner:**

- Vitest `^3`
- Config: `vitest.config.ts` (repo root)
- Coverage provider: `@vitest/coverage-v8 ^3`

**Assertion Library:**

- Vitest built-in (`expect`)

**Run Commands:**

```bash
pnpm test                  # Run all tests once (vitest run)
pnpm test:coverage         # Run all tests with v8 coverage report
```

No watch-mode script defined in `package.json`. Run `pnpm exec vitest` for interactive watch.

## Test File Organization

**Location:**

- Two discovery patterns configured in `vitest.config.ts`:
  - `apps/*/tests/**/*.{test,spec}.ts` — dedicated test directories per app
  - `apps/*/src/**/*.{test,spec}.ts` — co-located tests alongside source

**Current state:**

- No test files exist yet (`passWithNoTests: true` suppresses the failure)
- `apps/api/tests/` directory does not exist
- No `*.test.ts` or `*.spec.ts` files in any `src/` directory

**Naming convention (intended):**

- Test files: `*.test.ts` or `*.spec.ts`
- Spec files for integration-level tests: `*.spec.ts`

**Intended structure (based on config):**

```
apps/
  api/
    tests/
      routes/generate.test.ts    # per-route integration tests
      routes/cards.test.ts
      lib/audio.test.ts          # unit tests for lib functions
    src/
      lib/audio.test.ts          # or co-located alongside source
  mobile/
    src/
      providers/llm.test.ts      # unit tests for providers
      providers/tts.test.ts
```

**Note:** The `packages/db/` package is not included in the vitest discovery patterns — db package tests are not configured.

## Test Structure

**Suite Organization (Vitest standard):**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('contentHash', () => {
  it('returns a 64-char hex string', () => {
    const hash = contentHash('feijoada');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic output for same inputs', () => {
    expect(contentHash('oi')).toBe(contentHash('oi'));
  });
});
```

## Mocking

**Framework:** `vi` from Vitest

**Recommended patterns for this codebase:**

Mock `fetch` for external API provider tests:

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});
```

Mock environment variables:

```typescript
beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
  vi.stubEnv('NARAKEET_API_KEY', 'test-key');
  vi.stubEnv('PEXELS_API_KEY', 'test-key');
});
```

Mock `fs` for TTS disk operations:

```typescript
vi.mock('fs', () => ({
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  writeFileSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({ size: 16000 }),
}));
```

**What to mock:**

- All outbound `fetch` calls (OpenRouter, Narakeet, Pexels)
- `fs` module in `apps/mobile/src/providers/tts.ts`
- `process.env` values via `vi.stubEnv`
- Database (`db`) for route handler unit tests

**What NOT to mock:**

- Zod schemas and their `.parse()` / `.safeParse()` — test with real input/output
- `contentHash` in `apps/api/src/lib/audio.ts` — pure function, test directly
- `extractJson` helper in `llm.ts` — pure function

## Fixtures and Factories

**Test Data:**

No factory library or fixture files exist. Recommended patterns for this schema-heavy codebase:

```typescript
// Minimal valid card fixture
const makeCard = (overrides = {}) => ({
  id: 1,
  user_id: '00000000-0000-0000-0000-000000000001',
  card_kind: 'word' as const,
  headword: 'feijoada',
  gendered_form: 'a feijoada',
  gender: 'feminine' as const,
  stress_marker: 'fei.JO.a.da',
  state: 'new' as const,
  reps: 0,
  lapses: 0,
  due_at: new Date(),
  ...overrides,
});
```

**Location:**

- No `__fixtures__` or `__factories__` directories exist
- Fixtures should live in `apps/api/tests/fixtures/` when created

## Coverage

**Requirements:** None enforced (no coverage threshold configured)

**Provider:** `@vitest/coverage-v8`

**View Coverage:**

```bash
pnpm test:coverage    # generates coverage to ./coverage/
```

Coverage output goes to `./coverage/` (default v8 output directory). No CI enforcement of minimum thresholds.

## Test Types

**Unit Tests:**

- Scope: pure functions with no I/O — `contentHash`, `extractJson`, `estimateDurationMs`, `getGreeting`, `getStreakState`, `cardCounts`, `filterCards`, `stateColor`
- These are all testable without mocking

**Integration Tests:**

- Scope: Hono route handlers with mocked DB and external services
- Pattern: use `hono/testing` utilities or call `app.request()` directly
- All four routes in `apps/api/src/routes/` are candidates

**E2E Tests:**

- Not configured — no Playwright, Detox, or similar framework present

## Key Testable Units (Priority Order)

**High value, pure functions (no mocks needed):**

- `contentHash` — `apps/api/src/lib/audio.ts` and `apps/mobile/src/providers/tts.ts`
- `extractJson` — `apps/mobile/src/providers/llm.ts` (LLM fence-stripping logic)
- `cardCounts` — `apps/mobile/app/(tabs)/index.tsx`
- `filterCards` — `apps/mobile/app/(tabs)/cards/index.tsx`
- `getStreakState` — `apps/mobile/app/(tabs)/index.tsx`

**Medium value, requires mocking:**

- `extractWordFields` — `apps/mobile/src/providers/llm.ts` (mock fetch + test Zod validation path)
- `searchImages` — `apps/mobile/src/providers/image-search.ts` (mock fetch + test Pexels schema parsing)
- `synthesize` — `apps/mobile/src/providers/tts.ts` (mock fetch + fs)
- `POST /generate` — `apps/api/src/routes/generate.ts` (mock db + providers)
- `POST /cards` — `apps/api/src/routes/cards.ts` (mock db, test status validation)
- `POST /reviews` — `apps/api/src/routes/reviews.ts` (mock db, verify FSRS state mapping)

## Common Patterns

**Async Testing:**

```typescript
it('throws when API key is missing', async () => {
  vi.stubEnv('OPENROUTER_API_KEY', '');
  await expect(extractWordFields('oi')).rejects.toThrow('OPENROUTER_API_KEY not set');
});
```

**Error Testing:**

```typescript
it('returns 400 for invalid input', async () => {
  const res = await app.request('/generate', {
    method: 'POST',
    body: JSON.stringify({ input_text: '', kind: 'word' }),
    headers: { 'Content-Type': 'application/json' },
  });
  expect(res.status).toBe(400);
});
```

**Zod Schema Testing:**

```typescript
it('accepts valid WordFieldsOutput', () => {
  const valid = {
    lemma: 'feijoada',
    gender: 'feminine',
    gendered_form: 'a feijoada',
    stress_marker: 'fei.JO.a.da',
    usage_context: 'restaurante',
    register_tag: 'neutral',
    sounds_like: null,
    image_search_query: 'brazilian black bean stew',
    sentence_candidates: ['s1', 's2', 's3', 's4'],
  };
  expect(() => WordFieldsOutputSchema.parse(valid)).not.toThrow();
});
```

---

_Testing analysis: 2026-05-18_
