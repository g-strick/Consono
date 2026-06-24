---
phase: 03-streak-detail-design-fidelity
plan: '01'
subsystem: api-lib
tags: [tdd, pure-functions, streak-stats, aggregation]
dependency_graph:
  requires: [apps/api/src/lib/homeSummary.ts]
  provides: [apps/api/src/lib/streakStats.ts]
  affects: [apps/api/src/routes/streak.ts (Plan 02)]
tech_stack:
  added: []
  patterns: [vitest unit tests, pure-function lib, dayKeyLocal re-use from homeSummary.ts]
key_files:
  created:
    - apps/api/src/lib/streakStats.ts
    - apps/api/src/lib/streakStats.test.ts
  modified:
    - apps/api/src/lib/homeSummary.ts (no-op — dayKeyLocal was already exported on line 15)
decisions:
  - computeRetention returns fraction 0–1 (not a %); route in Plan 02 formats to %
  - inWindow is inclusive at both ends at local-day-key granularity
  - computeBestRuns returns [] on no reviews; route synthesizes the empty-state "0 days / today" row
  - computeBestRuns returns raw Date objects; route adds rank and date-strings for the mobile shape
  - computeHeatLevels single-distinct-nonzero value maps to level 3 (no ranking to do)
  - Test correction (Rule 1) in GREEN commit — see Deviations section
metrics:
  duration: '~25 minutes'
  completed: '2026-06-24'
  tasks_completed: 2
  files_count: 2
---

# Phase 03 Plan 01: streakStats Pure Aggregation Library Summary

One-liner: Pure vitest-tested aggregation library (6 functions) encoding D-04..D-09 True FSRS
retention, consecutive-run detection, quartile heatmap bucketing, and window-count helpers.

## What Was Built

`apps/api/src/lib/streakStats.ts` — 318-line pure library (no DB, no Hono) with six exported
functions that Plan 02 (streak route) will consume:

| Export                   | Decision     | What it does                                                                                             |
| ------------------------ | ------------ | -------------------------------------------------------------------------------------------------------- |
| `computeRetention`       | D-09         | True FSRS retention: recalled_due/total_due where state_before==='review'; returns 0 on zero denominator |
| `computeDaysActive`      | D-07         | Distinct active local-day-keys inside [windowStart, windowEnd] (inclusive)                               |
| `computeReviewsInWindow` | D-07         | Total review count inside window                                                                         |
| `computePerDayCount`     | D-07         | Map<dayKey, count> over all dates — input for heatmap                                                    |
| `computeHeatLevels`      | D-Discretion | Quartile-based 0–3 intensity; 0=no activity, single-distinct → 3                                         |
| `computeBestRuns`        | D-04/05/06   | Top-5 consecutive-day runs + current always present, tie-break by recency                                |

`apps/api/src/lib/streakStats.test.ts` — 29 vitest tests across all six describe blocks.
`apps/api/src/lib/homeSummary.ts` — **no-op**: `dayKeyLocal` was already exported at line 15,
so no edit was needed despite being listed in `files_modified`.

## Plan 02 Contract (for route author)

- `computeRetention` returns a **fraction 0.0–1.0**, not a percentage. Route multiplies by 100.
- `inWindow` is **inclusive on both ends** at local-day-key granularity (windowStart's full calendar
  day through windowEnd's full calendar day). Route must feed window boundaries that match (e.g.,
  month = localDayStart(firstOfMonth) → now).
- `computeBestRuns` returns **`[]` on no reviews** (not a single empty-state entry). The route
  synthesizes the UI-SPEC "0 days / today" row from the empty array.
- `computeBestRuns` returns **`{ days, start: Date, end: Date, current: boolean }`** — raw shapes.
  Route adds `rank` field and converts Date→ISO string for the mobile payload.

## TDD Gate Compliance

Gate sequence satisfied:

1. RED — `test(03-01): add failing tests for streakStats pure aggregation functions` — commit 769842d
2. GREEN — `feat(03-01): implement streakStats pure aggregation library (GREEN)` — commit d61901a

Both tasks (Task 1: retention/window helpers; Task 2: bestRuns/perDayCount/heatLevels) targeted
the same two files. The RED commit covers all six functions; the GREEN commit implements all six.
This is the same single-RED/single-GREEN pattern used in Phase 2 Plan 01 (homeSummary.ts).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected self-contradictory tie-break test in RED commit**

- **Found during:** GREEN phase, running tests after implementation
- **Issue:** The tie-break test built a "recent" run ending 1 day ago — which the implementation
  correctly flagged as `current` (matching computeStreak's grace semantics). The `!r.current`
  filter then left only 1 non-current run, so `runs.length >= 2` failed. The code was correct;
  the test's assumption was internally contradictory with the D-05 spec.
- **Fix:** Rewrote the test to use two purely historical runs (ending 5 days ago and 20 days ago)
  that are definitively non-current. The rewrite still exercises the tie-break comparator:
  with input sorted oldest-first in the run-detection loop, the sort must actively reorder them
  to put `runs[0].end > runs[1].end` — the assertion is real.
- **Files modified:** apps/api/src/lib/streakStats.test.ts
- **Commit:** d61901a

**2. [Rule 1 - Bug] computeHeatLevels single-value edge case**

- **Found during:** GREEN phase, first test run
- **Issue:** When all non-zero counts are the same value, `q1 === the value` and all entries got
  assigned level 1 instead of level 3. The behavior was wrong for a single-distinct-nonzero case.
- **Fix:** Added explicit `if (distinctValues.size === 1)` branch that assigns level 3 to all
  non-zero entries before running the quartile logic.
- **Files modified:** apps/api/src/lib/streakStats.ts
- **Commit:** d61901a

### homeSummary.ts no-op

Listed in plan `files_modified` but required no edit — `dayKeyLocal` was already exported at line 15
of `apps/api/src/lib/homeSummary.ts`. Documented as a no-op rather than an omission.

## Threat Flags

None — pure functions, no I/O, no trust boundaries (per T-03-01 accept disposition in plan).

## Self-Check: PASSED

**Files exist:**

- FOUND: apps/api/src/lib/streakStats.ts (318 lines — min 80 met)
- FOUND: apps/api/src/lib/streakStats.test.ts (contains `describe('computeRetention'` literally)

**Commits exist:**

- FOUND: 769842d — test(03-01): add failing tests for streakStats pure aggregation functions
- FOUND: d61901a — feat(03-01): implement streakStats pure aggregation library (GREEN)

**Acceptance criteria verified:**

- 29/29 tests pass (full suite: 44/44 across all 3 test files — no regressions)
- `grep -c "import.*db\|import.*hono" streakStats.ts` → 0 (no db/hono imports)
- `grep "import.*dayKeyLocal.*homeSummary"` → matches `import { dayKeyLocal } from './homeSummary.js'`
- 6 exports confirmed: computeRetention, computeBestRuns, computePerDayCount, computeDaysActive,
  computeReviewsInWindow, computeHeatLevels
