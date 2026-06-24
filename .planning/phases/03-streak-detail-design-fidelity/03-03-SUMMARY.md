---
plan: 03-03
status: complete
commit: 1190a9f
---

## What was built

Wired `apps/mobile/app/streak/index.tsx` to real `getStreakStats()` data via a single TanStack Query (`queryKey: ['streak','stats']`, `staleTime: 30s`). All static placeholder constants removed (HERO, STATS, RATING, YEAR_LEVELS, YEAR_MONTHS, MONTH_DAYS, MONTH_TODAY, REVIEWS, BESTS). All three periods arrive in one payload — period toggle is instant with no refetch. Zeros render while loading (no skeleton).

## Tasks completed

- **Task 1:** Added `useQuery`, derived hero and 2×2 stat tiles from live `streakStats` with D-07/D-08/D-09 semantics (month subs = 'this month', retention = FSRS integer 0-100 directly, stat windows match heatmap).
- **Task 2:** Replaced heatmap constants with computed arrays from `heatLevels`/`perDay`; today outlined at index 370 (year) and `monthTodayIndex` (month). Wired `ReviewsChart` and `LifetimeBars` from `perMonth`/`perDay`. Fed `RatingDistribution` from `ratingCounts` (raw counts). Built personal bests from `streakStats.bests` with empty-state fallback.
- **Task 3:** Human checkpoint — user approved.

## Acceptance criteria met

- `grep -nE "const (HERO|STATS|RATING|YEAR_LEVELS|MONTH_DAYS|REVIEWS|BESTS)"` → 0 matches ✓
- `queryKey: ['streak','stats']` and `api.getStreakStats()` present ✓
- Month subs read 'this month'; no 'past 30 days' in body ✓
- `tsc --noEmit` clean for streak/index.tsx ✓
- Human visual verification approved ✓
