---
phase: 03-streak-detail-design-fidelity
plan: '02'
subsystem: api-route + mobile-client
tags: [http-route, hono, drizzle, mobile-api, streak-stats, security]
dependency_graph:
  requires: [apps/api/src/lib/streakStats.ts (Plan 01)]
  provides:
    - apps/api/src/routes/streak.ts (GET /streak/stats)
    - apps/mobile/src/lib/api.ts (getStreakStats + StreakStats)
  affects: [apps/mobile/app/streak/index.tsx (Plan 03)]
tech_stack:
  added: []
  patterns:
    - Hono route with inArray security scope (mirrors home.ts T-02-01 pattern)
    - Object.fromEntries to serialize Map → Record before c.json
    - TanStack Query client method mirroring getHomeSummary()
key_files:
  created:
    - apps/api/src/routes/streak.ts
  modified:
    - apps/api/src/index.ts (route registration)
    - apps/mobile/src/lib/api.ts (StreakStats interface + getStreakStats)
    - apps/api/src/lib/streakStats.ts (Rule 1 TS fixes)
    - apps/api/src/lib/streakStats.test.ts (Rule 1 TS fixes)
decisions:
  - lifetime.longestStreak = max days from computeBestRuns (not computeStreak which is current-only)
  - retention returned as integer % 0-100 (route: Math.round(fraction * 100)) for hero + all periods
  - windowLongest filters allBestRuns to runs ending within the period window (not period-start runs)
  - perDay/heatLevels are window-scoped per period (quartiles differ per window)
  - year.perMonth = trailing 12 calendar months; lifetime.perMonth = all months since first review
  - Object.fromEntries converts Map → Record before c.json (JSON.stringify(Map) === '{}' trap)
metrics:
  duration: '~7 minutes'
  completed: '2026-06-24'
  tasks_completed: 2
  files_count: 5
---

# Phase 03 Plan 02: GET /streak/stats Route + Mobile Client Summary

One-liner: Hono route aggregating month/year/lifetime streak stats in one user-scoped payload (with year daily heatmap data), plus typed `getStreakStats()` client method for Plan 03 consumption.

## What Was Built

### Task 1: GET /streak/stats route + index.ts registration

`apps/api/src/routes/streak.ts` — full aggregation route consuming the Plan-01 pure lib:

| Payload key | What's in it                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| `hero`      | streak count, longestAllTime, retentionAllTime (integer %)                                                |
| `month`     | longestStreak/Dates, retention %, totalReviews, daysActive, daysInMonth, perDay, heatLevels, ratingCounts |
| `year`      | same + perDay/heatLevels (~371 daily cells for YearHeatmap) + 12-month perMonth bar-chart                 |
| `lifetime`  | same + firstReviewDate + all-time perMonth + no perDay (uses LifetimeBars)                                |
| `bests`     | top-5 + current runs, rank/days/startDate/endDate/current, empty-state row synthesized                    |

Security: `inArray(reviews.card_id, userCardIds)` per T-03-02 — mirrors home.ts pattern exactly.

Period windows (D-07):

- Month = 1st of current calendar month at local 00:00 → now
- Year = now − 53 weeks at local 00:00 → now
- Lifetime = earliest reviewed_at → now

`apps/api/src/index.ts` — `app.route('/streak', streakRoute)` registered alongside homeRoute.

### Task 2: StreakStats interface + getStreakStats() in mobile api.ts

`apps/mobile/src/lib/api.ts` — added:

- `export interface StreakStats` with all 5 top-level keys (hero/month/year/lifetime/bests)
- `year` block explicitly includes `perDay` + `heatLevels` for YearHeatmap
- Comments document retention as integer 0–100 and longestDates format ('mmm d – mmm d')
- `getStreakStats() { return request<StreakStats>('/streak/stats'); }` in the `api` object

## Plan 03 Contract (for screen author)

- `retention` fields are integer % 0–100 (not fractions)
- `longestDates` is preformatted 'mmm d – mmm d' or `null` — render directly
- `year.perDay` and `year.heatLevels` are `Record<string, number>` (YYYY-MM-DD keys)
- `bests[].rank` is `number | string` — can be 1–5 or the string `'current'`
- `bests` always has at least 1 entry (empty-state row synthesized when no reviews)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] corrected `lifetime.longestStreak` computation**

- **Found during:** Task 1 implementation (advisor review before writing)
- **Issue:** Plan text said "or the all-time `computeStreak` for lifetime" — but `computeStreak` returns the _current_ streak length, not the all-time longest. Using it would make `lifetime.longestStreak` inconsistent with `hero.longestAllTime`.
- **Fix:** `lifetime.longestStreak = windowLongest(lifetimeStart, now)` — same mechanism as month/year, finding the longest run ending within the lifetime window (= all time). This correctly equals `hero.longestAllTime`.
- **Files modified:** apps/api/src/routes/streak.ts (design correction at write time)

**2. [Rule 1 - Bug] Fixed `noUncheckedIndexedAccess` TypeScript errors in streakStats.ts**

- **Found during:** Task 1, first `tsc --noEmit` run
- **Issue:** Pre-existing errors from Plan 01 — array index access (`activeDayKeys[i]`, `nonZeroCounts[Math.floor(...)]`, `key.split('-').map(Number)[0]`) returning `T | undefined` under strict `noUncheckedIndexedAccess` tsconfig option.
- **Fix:** Added `!` non-null assertions where indices are provably in-bounds (guard conditions above guarantee this), and `?? fallback` for quartile boundary computation with explanatory comments.
- **Files modified:** apps/api/src/lib/streakStats.ts, apps/api/src/lib/streakStats.test.ts
- **Commits:** 03b3279 (included in Task 1 commit)

**3. [Rule 1 - Bug] `cards` import unused (ESLint error)**

- **Found during:** Task 1, first commit attempt (pre-commit hook)
- **Issue:** `import { db, cards, reviews }` — `cards` never used directly (only `reviews` needed for `inArray`); ESLint no-unused-vars error.
- **Fix:** Removed `cards` from import: `import { db, reviews }`.
- **Files modified:** apps/api/src/routes/streak.ts

**4. [Design Correction] Map → Record serialization**

- **Found during:** Task 1 implementation (before writing, via advisor)
- **Issue:** `JSON.stringify(new Map(...))` produces `{}` — `perDay` and `heatLevels` would silently serialize as empty objects if passed directly to `c.json`.
- **Fix:** `Object.fromEntries(perDayMap)` and `Object.fromEntries(heatLevelsMap)` before building the payload. Not a deviation from the plan intent — plan never specified Maps; this is correct implementation.

## Threat Flags

None — T-03-02 (information disclosure) explicitly mitigated via `inArray` security scope. T-03-03 accepted (no new packages). No new trust boundaries introduced.

## Self-Check: PASSED

**Files exist:**

- FOUND: apps/api/src/routes/streak.ts
- FOUND: apps/api/src/index.ts (contains `app.route('/streak', streakRoute)`)
- FOUND: apps/mobile/src/lib/api.ts (contains `export interface StreakStats` and `getStreakStats()`)

**Commits exist:**

- FOUND: 03b3279 — feat(03-02): create GET /streak/stats route + register in index.ts
- FOUND: 84032c4 — feat(03-02): add StreakStats interface + getStreakStats() to mobile api client

**Acceptance criteria verified:**

- `grep "streakRoute.get('/stats'"` → 1 match in streak.ts
- `grep "inArray(reviews.card_id, userCardIds)"` → 1 match in streak.ts
- `year` block in route references `perDay` and `heatLevels` (windowHeatData + explicit fields)
- `app.route('/streak', streakRoute)` present in index.ts
- `corepack pnpm --filter @portuguese-app/api exec tsc --noEmit` → exit 0 (clean)
- Mobile `tsc --noEmit` → exit 0, no errors in api.ts
- `StreakStats.year` includes both `perDay` and `heatLevels` (confirmed by read)
- 54/54 tests pass (no regressions from TS fixes to streakStats.ts + .test.ts)
