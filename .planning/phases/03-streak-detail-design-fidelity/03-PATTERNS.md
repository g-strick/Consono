# Phase 3: Streak Detail + Design Fidelity — Pattern Map

**Mapped:** 2026-06-24
**Files analyzed:** 7 new/modified files
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File                                                            | Role             | Data Flow        | Closest Analog                                                         | Match Quality   |
| ---------------------------------------------------------------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------- | --------------- |
| `apps/api/src/lib/streakStats.ts`                                            | utility/lib      | transform/batch  | `apps/api/src/lib/homeSummary.ts`                                      | exact           |
| `apps/api/src/lib/streakStats.test.ts`                                       | test             | transform        | `apps/api/src/lib/homeSummary.test.ts`                                 | exact           |
| `apps/api/src/routes/streak.ts` (or extend `home.ts`)                        | route            | request-response | `apps/api/src/routes/home.ts`                                          | exact           |
| `apps/mobile/src/lib/api.ts` (add `getStreakStats`)                          | utility/client   | request-response | same file — `getHomeSummary()` method                                  | exact           |
| `apps/mobile/app/streak/index.tsx` (wire real data, replace HERO/STATS/etc.) | screen/component | CRUD/query       | `apps/mobile/app/(tabs)/index.tsx` (TanStack Query pattern)            | role-match      |
| `apps/mobile/src/components/ReviewsChart` (inline in streak/index.tsx)       | component        | transform        | inline `ReviewsChart` fn lines 317–370 of `streak/index.tsx`           | extend-in-place |
| `apps/mobile/src/components/LifetimeBars` (inline in streak/index.tsx)       | component        | transform        | inline `LifetimeBars` fn lines 376–417 of `streak/index.tsx`           | extend-in-place |
| DSGN-02: all mobile screens + components (audit pass)                        | cross-cutting    | N/A              | `apps/mobile/src/lib/theme.ts` + `apps/mobile/src/components/Type.tsx` | exact           |

---

## Pattern Assignments

### `apps/api/src/lib/streakStats.ts` (utility/lib, transform/batch)

**Analog:** `apps/api/src/lib/homeSummary.ts`

**File header + module pattern** (lines 1–9):

```typescript
/**
 * streakStats.ts — Pure streak-detail aggregation functions.
 *
 * No DB imports, no Hono — pure functions so they are unit-testable with vitest.
 * Consumer: apps/api/src/routes/streak.ts (or home.ts extended)
 *
 * Day boundary: device-local midnight (D-02). Uses dayKeyLocal/localDayStart
 * re-exported from homeSummary.ts — do NOT duplicate them.
 */
```

**Imports pattern** (lines 1–8 of homeSummary.ts):

```typescript
// No imports needed — pure date math only
// Re-use: import { dayKeyLocal, localDayStart } from './homeSummary.js'
// Export from homeSummary.ts if not already exported, or copy-import here
```

**Core function shape to model** (homeSummary.ts lines 15–29, 41–92):

```typescript
// dayKeyLocal — re-use from homeSummary (already exported):
export function dayKeyLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// computeStreak pattern to extend for longest-run detection:
export function computeStreak(reviewedAtDates: Date[], now: Date): number {
  if (reviewedAtDates.length === 0) return 0;
  const activeDays = new Set<string>(reviewedAtDates.map(dayKeyLocal));
  // ... walk backwards counting consecutive active days
}
```

**New pure functions to add in `streakStats.ts`** (schema columns from CONTEXT D-09 / schema.ts):

```typescript
// Input shape for retention (D-09):
type ReviewRow = {
  reviewed_at: Date;
  rating: 'again' | 'hard' | 'good' | 'easy';
  state_before: 'new' | 'learning' | 'review' | 'relearning';
};

// D-09: True FSRS retention — only 'review' state_before reps
// retention = recalled_due / total_due; 0 due → return 0
export function computeRetention(reviews: ReviewRow[], windowStart: Date, windowEnd: Date): number;

// D-04/D-05: maximal consecutive-day runs, ranked longest-first
// Run = consecutive active days (>=1 review). Top-5 + current always shown.
export function computeBestRuns(
  reviewedAtDates: Date[],
  now: Date,
): Array<{ days: number; start: Date; end: Date; current: boolean }>;

// D-07: per-day review counts for heatmap intensity mapping
export function computePerDayCount(reviewedAtDates: Date[]): Map<string, number>;

// D-07: days active within a window (>=1 review on that day)
export function computeDaysActive(
  reviewedAtDates: Date[],
  windowStart: Date,
  windowEnd: Date,
): number;

// D-07: total reviews within a window
export function computeReviewsInWindow(
  reviewedAtDates: Date[],
  windowStart: Date,
  windowEnd: Date,
): number;
```

**No error handling needed** — pure functions; callers handle any thrown errors.

---

### `apps/api/src/lib/streakStats.test.ts` (test, transform)

**Analog:** `apps/api/src/lib/homeSummary.test.ts`

**Test file header + vitest import pattern** (lines 1–8):

```typescript
/**
 * streakStats.test.ts — Unit tests for streak detail aggregation.
 *
 * Uses vitest describe/it/expect. No @types/jest needed.
 * Run: corepack pnpm vitest run apps/api/src/lib/streakStats.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  computeRetention,
  computeBestRuns,
  computePerDayCount,
  computeDaysActive,
} from './streakStats';
```

**daysAgoFrom helper pattern** (lines 13–18):

```typescript
/** Build a Date that is `daysAgo` calendar days before `now` at noon local time. */
function daysAgoFrom(now: Date, daysAgo: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0); // noon local time — clearly within that calendar day
  return d;
}
```

**Test structure pattern** (lines 22–46 in homeSummary.test.ts):

```typescript
describe('computeRetention', () => {
  it('returns 0 when no review-state reviews in window', () => { ... });
  it('counts only state_before=review reps (D-09)', () => { ... });
  it('excludes again from numerator', () => { ... });
});

describe('computeBestRuns', () => {
  it('returns empty array for no reviews', () => { ... });
  it('marks the current run with current: true (D-05)', () => { ... });
  it('returns top 5 ordered longest-first (D-04)', () => { ... });
  it('always includes current even if not top-5 (D-05)', () => { ... });
});
```

**Equal-length-tie rule to test** (D-05): when runs share the same length, the most-recent one ranks higher.

---

### `apps/api/src/routes/streak.ts` (route, request-response)

**Analog:** `apps/api/src/routes/home.ts`

**Imports pattern** (home.ts lines 1–6):

```typescript
import { Hono } from 'hono';
import { db, cards, reviews } from '@portuguese-app/db';
import { inArray } from 'drizzle-orm';
import { V0_USER_ID } from '../lib/constants.js';
import {
  computeStreak,
  computeRetention,
  computeBestRuns,
  computePerDayCount,
  computeDaysActive,
  computeReviewsInWindow,
} from '../lib/streakStats.js';
```

**Security scope pattern — reviews scoped via user's card ids** (home.ts lines 44–53):

```typescript
// SECURITY: reviews has no user_id — scope via inArray over this user's card ids (T-02-01)
const userCardIds = userCards.map((card) => card.id);
const userReviews =
  userCardIds.length > 0
    ? await db.query.reviews.findMany({
        where: inArray(reviews.card_id, userCardIds),
      })
    : [];
```

**Route handler + JSON response pattern** (home.ts lines 15–78):

```typescript
export const streakRoute = new Hono();

/**
 * GET /streak/stats — aggregated streak detail for all three periods.
 * Returns month/year/lifetime stats in one payload for instant period toggle (D-Claude).
 */
streakRoute.get('/stats', async (c) => {
  // 1. user's cards (for card-id scoping)
  // 2. userReviews via inArray (T-02-01 security)
  // 3. compute per-period windows (D-07):
  //    month = first of current month → now
  //    year  = now - 53 weeks → now
  //    lifetime = all time
  // 4. aggregate all three periods in one pass
  return c.json({
    hero: { streak, longestAllTime, retentionAllTime },
    month: {
      longestStreak,
      longestDates,
      retention,
      totalReviews,
      daysActive,
      daysInMonth,
      perDay,
      ratingCounts,
    },
    year: {
      longestStreak,
      longestDates,
      retention,
      totalReviews,
      daysActive,
      perMonth,
      ratingCounts,
    },
    lifetime: {
      longestStreak,
      longestDates,
      retention,
      totalReviews,
      daysActive,
      firstReviewDate,
      perMonth,
      ratingCounts,
    },
    bests: [{ rank, days, start, end, current }], // top-5 + current (D-05)
  });
});
```

**Registration in `apps/api/src/index.ts`** (pattern from existing index.ts):

```typescript
import { streakRoute } from './routes/streak.js';
// ...
app.route('/streak', streakRoute);
```

No Zod validation needed on the GET route — no request body. Route returns a pure JSON payload.

---

### `apps/mobile/src/lib/api.ts` (add `getStreakStats` method)

**Analog:** `getHomeSummary()` method in the same file (lines 102–104)

**Type interface pattern** (lines 89–95):

```typescript
export interface StreakStats {
  hero: { streak: number; longestAllTime: number; retentionAllTime: number };
  month: {
    longestStreak: number;
    longestDates: string | null;
    retention: number;
    totalReviews: number;
    daysActive: number;
    daysInMonth: number;
    perDay: Record<string, number>; // 'YYYY-MM-DD' → count for heatmap
    ratingCounts: { again: number; hard: number; good: number; easy: number };
  };
  year: {
    longestStreak: number;
    longestDates: string | null;
    retention: number;
    totalReviews: number;
    daysActive: number;
    perMonth: Array<{ label: string; count: number }>; // 12 months for bar chart
    ratingCounts: { again: number; hard: number; good: number; easy: number };
  };
  lifetime: {
    longestStreak: number;
    longestDates: string | null;
    retention: number;
    totalReviews: number;
    daysActive: number;
    firstReviewDate: string | null;
    perMonth: Array<{ label: string; count: number }>; // all months for bar chart
    ratingCounts: { again: number; hard: number; good: number; easy: number };
  };
  bests: Array<{
    rank: number | string;
    days: number;
    startDate: string;
    endDate: string;
    current: boolean;
  }>;
}
```

**Method pattern** (lines 102–104):

```typescript
export const api = {
  // ... existing methods ...
  getStreakStats() {
    return request<StreakStats>('/streak/stats');
  },
};
```

---

### `apps/mobile/app/streak/index.tsx` (wire real data)

**Analog for TanStack Query pattern:** `apps/mobile/app/(tabs)/index.tsx`

**TanStack Query hook pattern** (index.tsx lines 57–73):

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/src/lib/api';

// Inside StreakScreen():
const { data: streakStats } = useQuery({
  queryKey: ['streak', 'stats'],
  queryFn: () => api.getStreakStats(),
  staleTime: 1000 * 30, // 30s — fresh enough for a detail screen
});
```

**Zero-while-loading pattern** (index.tsx lines 75–81 — use nullish coalescing to default to zeros):

```typescript
// Per UI-SPEC Data States: show zeros until query resolves; no skeleton, no loading state
const hero = streakStats?.hero ?? { streak: 0, longestAllTime: 0, retentionAllTime: 0 };
const periodData = streakStats?.[period] ?? periodDefaults[period];
const bests = streakStats?.bests ?? [
  { rank: '→', days: 0, startDate: 'today', endDate: 'today', current: true },
];
```

**What stays static vs what gets replaced:**

- Keep: `Period` type, `useState<Period>('year')`, all JSX layout, all StyleSheet styles
- Remove: `HERO`, `STATS`, `RATING`, `YEAR_LEVELS`, `YEAR_MONTHS`, `MONTH_DAYS`, `MONTH_TODAY`, `REVIEWS`, `BESTS` placeholder constants (lines 33–172)
- Add: `useQuery` call, derive display values from `streakStats` using nullish-coalescing zeros

**Heatmap data derivation** (from `perDay` map → sorted levels array for `YearHeatmap` / `MonthHeatmap`):

```typescript
// Map perDay record into the 371-element levels array for YearHeatmap
// Quartile-based 0–3 bucketing (Claude's Discretion): quartiles over non-zero counts
// Today cell: always todayIndex = last filled column's last-day index
```

---

### `ReviewsChart` and `LifetimeBars` (inline in `streak/index.tsx`)

**Status:** These are NOT missing components and NOT standalone files. They exist as inline local functions in `apps/mobile/app/streak/index.tsx`:

- `ReviewsChart` — lines 317–370
- `LifetimeBars` — lines 376–417

**Analog:** Themselves — the current inline implementation is the pattern. Phase 3 replaces their static data source (`REVIEWS` constant) with derived data from `streakStats`.

**Decision for planner:** Extend in-place (replace data source, keep JSX/styles) vs extract to `src/components/`. Either is valid; extending in-place is lower-risk since the component API is already stable.

**Current ReviewsChart props** (lines 317–324):

```typescript
function ReviewsChart({
  period,
  bars,     // number[] — normalized 0-1 heights
  labels,   // string[] — axis tick labels
  style,
}: { period: Period; bars: number[]; labels: string[]; style?: object }) {
```

**LifetimeBars** currently reads from the `REVIEWS.lifetime` constant directly (lines 376–417) — it needs a `bars`/`labels` prop to accept real data.

---

## Shared Patterns

### Surface-aware text (DSGN-02 core pattern)

**Source:** `apps/mobile/src/lib/theme.ts` + `apps/mobile/src/components/Type.tsx`

**The correct pattern — `useTextColor` via tone prop** (Type.tsx lines 32–39):

```typescript
function useTextColor(
  surface?: Surface,
  tone?: TextTone,
  defaultTone: TextTone = 'primary',
): string {
  const { surface: ctxSurface } = useTheme();
  return textForSurface(surface ?? ctxSurface, tone ?? defaultTone);
}
```

**`textForSurface` enforces the rule** (theme.ts lines 96–98):

```typescript
export function textForSurface(surface: Surface, tone: TextTone = 'primary'): string {
  return textColors[surface][tone];
}
```

**textColors table** (theme.ts lines 64–89):

```typescript
export const textColors = {
  light: {
    primary: '#000000',
    muted: 'rgba(0,0,0,0.60)',
    faint: 'rgba(0,0,0,0.42)',
    brand: '#1F3494',
  },
  color: {
    primary: '#FFFFFF',
    muted: 'rgba(255,255,255,0.75)',
    faint: 'rgba(255,255,255,0.55)',
    brand: '#FFFFFF',
  },
  oled: {
    primary: '#FFFFFF',
    muted: 'rgba(255,255,255,0.70)',
    faint: 'rgba(255,255,255,0.50)',
    brand: '#5A8FD4',
  },
  gold: {
    primary: '#1F3494',
    muted: 'rgba(31,52,148,0.65)',
    faint: 'rgba(31,52,148,0.45)',
    brand: '#1F3494',
  },
};
```

**Cobalt is ALLOWED on:**

- `<Num>` — default tone is `'brand'`; cobalt is correct and expected (lines 150–151)
- `<Action>` — default tone is `'brand'` (lines 172–173)
- `<Body tone="brand">` — explicit key-action usage (nav back/share, active toggle)
- `<Mono tone="brand">` — axis labels, "current" badge
- `backgroundColor: colors.brand` — surfaces, borders, heatmap fills (not text)
- `borderColor: colors.brand` — today cell outline

**Cobalt VIOLATIONS to find and fix (DSGN-02 audit):**

| File                         | Line(s) | Violation                                                                                  | Fix                                                                                   |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `app/(tabs)/cards/index.tsx` | 45–46   | `borderColor: '#1F3494'` on active filter (text labels in filter use cobalt body copy)     | Use `colors.brand` for borders, but verify text inside filter uses tone system        |
| `app/(tabs)/cards/index.tsx` | 61      | `ActivityIndicator color="#1F3494"`                                                        | Acceptable — not text                                                                 |
| `app/(tabs)/cards/index.tsx` | 82, 110 | `color: '#1F3494'` for gender/state inline text styles bypassing theme                     | Replace with `textColors.light.brand` or restructure using `Chip`/`Body tone="brand"` |
| `app/(tabs)/add/index.tsx`   | 1093    | `<Body size={34} style={{ color: colors.brand }}>` — Body copy with inline cobalt override | Use `<Body tone="brand">` instead of `style={{ color }}` override                     |

**Audit execution approach:** Scan each file for `color: colors.brand`, `color: colors.brandFill`, `color: '#1F3494'`, and `color: '#2E5BC8'` in text styles (not border/background). For each hit, check: is this a `Num`, `Action`, or explicit `tone="brand"` call-site? If not, it's a violation — replace with `tone` prop or `textColors.light.primary/muted/faint`.

---

### TanStack Query keyed pattern

**Source:** `apps/mobile/app/(tabs)/index.tsx` lines 57–82

**Apply to:** `streak/index.tsx` data-wiring

```typescript
const { data } = useQuery({
  queryKey: ['streak', 'stats'], // keyed list: noun + operation
  queryFn: () => api.getStreakStats(),
  staleTime: 1000 * 30,
});
// Zero-while-loading: const value = data?.field ?? 0;
```

---

### Drizzle inArray security scope

**Source:** `apps/api/src/routes/home.ts` lines 44–53

**Apply to:** `streak.ts` route (same security pattern — reviews has no user_id)

```typescript
const userCardIds = userCards.map((card) => card.id);
const userReviews =
  userCardIds.length > 0
    ? await db.query.reviews.findMany({ where: inArray(reviews.card_id, userCardIds) })
    : [];
```

---

### Route registration

**Source:** `apps/api/src/index.ts`

**Apply to:** new `streak.ts` route (if planner chooses new-route over extend):

```typescript
// Pattern from existing registration:
import { streakRoute } from './routes/streak.js';
app.route('/streak', streakRoute);
```

---

## No Analog Found

None — all files have analogs in the codebase.

---

## Metadata

**Analog search scope:** `apps/api/src/lib/`, `apps/api/src/routes/`, `apps/mobile/app/`, `apps/mobile/src/components/`, `apps/mobile/src/lib/`
**Files scanned:** ~18 source files read
**Pattern extraction date:** 2026-06-24
