<!-- generated-by: gsd-doc-writer -->

# Testing

This guide covers the test setup, how to run tests, and how to write new tests for the Consono monorepo.

## Test Framework and Setup

The project uses [Vitest](https://vitest.dev/) v3, configured at the monorepo root in `vitest.config.ts`. Coverage is provided by the `@vitest/coverage-v8` package.

No per-workspace test config is needed — the root config discovers all test files across both `apps/api` and `apps/mobile`.

```ts
// vitest.config.ts
{
  test: {
    include: ['apps/*/tests/**/*.{test,spec}.ts', 'apps/*/src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
    },
  },
}
```

No additional setup step is required before running tests beyond installing dependencies with `pnpm install`.

## Running Tests

### Full test suite

```bash
make test
```

This is equivalent to `pnpm test`, which runs `vitest run` (non-interactive, single pass).

### Coverage report

```bash
pnpm test:coverage
```

Generates a v8 coverage report. No minimum thresholds are currently configured.

### Single file

To run a single test file, pass its path directly to vitest:

```bash
corepack pnpm exec vitest run apps/api/src/lib/streakStats.test.ts
corepack pnpm exec vitest run apps/mobile/src/lib/useNightSurface.test.ts
```

### Full CI check (typecheck + lint + test)

```bash
make check
```

## Test File Conventions

Tests live **next to the source file they exercise**, not in a separate `tests/` directory. The naming pattern is `{module}.test.ts`.

```text
apps/api/src/lib/
  homeSummary.ts
  homeSummary.test.ts       ← co-located unit test
  streakStats.ts
  streakStats.test.ts

apps/mobile/src/lib/
  useNightSurface.ts
  useNightSurface.test.ts   ← co-located unit test
  detectKind.ts
  detectKind.test.ts
  cardUtils.ts
  cardUtils.test.ts
```

The root `vitest.config.ts` picks up both `apps/*/src/**/*.test.ts` and `apps/*/tests/**/*.test.ts`, so a separate `tests/` directory at the app root is also valid for integration-style tests.

## What Is Tested

All current tests are **unit tests** covering pure functions — no HTTP routes, no database, no React components.

| File                                          | App    | What it tests                                                                                                                                     |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/lib/homeSummary.test.ts`        | api    | Date key helpers (`dayKeyLocal`, `localDayStart`), streak counting (`computeStreak`), and today's review stats (`computeTodayStats`)              |
| `apps/api/src/lib/streakStats.test.ts`        | api    | Streak detail aggregation: retention rate, days-active window, review counts, best-run ranking, per-day heatmap bucketing                         |
| `apps/mobile/src/lib/cardUtils.test.ts`       | mobile | Card filtering (`filterCards`) with AND logic across gender/register/srs_state dimensions; date formatters `formatDueAt` and `formatLastReviewed` |
| `apps/mobile/src/lib/useNightSurface.test.ts` | mobile | OLED night-surface predicate (`isOledSurface`) across dark/light mode and hour boundaries                                                         |
| `apps/mobile/src/lib/detectKind.test.ts`      | mobile | Word vs. sentence detection (`detectKind`) — written as plain Node assertions, not vitest `describe`/`it`                                         |

There are no integration tests or end-to-end tests at this time.

## Writing New Tests

### Standard pattern (vitest describe/it/expect)

Import directly from `vitest` — there is no global test environment configured, so named imports are required:

```ts
import { describe, it, expect } from 'vitest';
import { myPureFunction } from './myModule';

describe('myPureFunction', () => {
  it('returns the expected value for a known input', () => {
    expect(myPureFunction('input')).toBe('expected');
  });
});
```

Place the test file next to the source file and name it `{module}.test.ts`.

### Date-dependent tests

The existing tests use a local `daysAgoFrom` helper rather than mocking `Date.now`. This pattern avoids time-zone sensitivity by constructing dates at noon local time:

```ts
function daysAgoFrom(now: Date, daysAgo: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0); // noon local — clearly within the calendar day
  return d;
}
```

Pass the constructed `now` into the function under test rather than relying on `new Date()` inside the implementation when testability matters.

## Mocking Patterns

### Mocking React Native modules

`apps/mobile` tests that import React hooks or native modules must mock `react-native` before the import under test, because Vitest runs in Node and cannot resolve native bindings.

```ts
import { vi, describe, it, expect } from 'vitest';

// Mock react-native BEFORE importing the module under test.
vi.mock('react-native', () => ({ useColorScheme: () => null }));

import { isOledSurface } from './useNightSurface';
```

Test the exported **pure predicate** (`isOledSurface`) rather than the React hook wrapper (`useNightSurface`) to keep tests free of the React rendering lifecycle.

## CI Integration

Tests run automatically on every push to `main` and on every pull request targeting `main`.

**Workflow:** `.github/workflows/ci.yml`, job `check`

The test step runs after format check, type check, lint, markdown lint, and spell check:

```yaml
- name: Test
  run: pnpm test
```

A failing test blocks merge. There is no separate test-only workflow — the full `check` job must pass.
