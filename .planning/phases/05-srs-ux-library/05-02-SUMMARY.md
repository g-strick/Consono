---
phase: 05-srs-ux-library
plan: 02
subsystem: api + mobile-lib
tags: [hono, drizzle, react-query, typescript, vitest, cardUtils]

# Dependency graph
requires:
  - phase: 05-01
    provides: suspended_at nullable timestamp column on cards table
provides:
  - GET /cards (all incl. suspended, newest-first)
  - GET /cards/due (updated: adds isNull(suspended_at) filter)
  - GET /cards/:id, PATCH /cards/:id (conditional audio re-synth)
  - PATCH /cards/:id/suspend (sets suspended_at timestamp or null)
  - DELETE /cards/:id (reviews FK-safe, then card)
  - AllCard interface + 5 api client methods
  - filterCards, formatDueAt, formatLastReviewed pure functions + 13 tests
affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Relational query callback form for isNull/desc (avoids noUnusedLocals tsc error)'
    - 'Static routes registered before parameterized routes (/due before /:id)'
    - 'FK-safe delete: reviews first, then card'
    - 'Conditional audio re-synth: only when sentence_pt present and differs'
    - 'Local midnight boundaries for formatDueAt (not toDateString string comparison)'

key-files:
  created:
    - apps/mobile/src/lib/cardUtils.ts
    - apps/mobile/src/lib/cardUtils.test.ts
  modified:
    - apps/api/src/routes/cards.ts
    - apps/mobile/src/lib/api.ts

key-decisions:
  - 'isNull/desc used inside relational-query callbacks only — not top-level imports (noUnusedLocals constraint)'
  - 'AllCard extends DueCard: adds source_tag, stability, difficulty, reps, lapses, last_reviewed_at, created_at, suspended_at'
  - 'filterCards suspended branch: suspended_at != null takes priority; active-state filter implicitly excludes suspended'
  - 'formatDueAt uses local midnight (new Date(y,m,d+1)) not toDateString() — toDateString string comparison breaks Sun/Mon boundary'

patterns-established:
  - 'AllCard extends DueCard pattern for library cards needing SRS stat fields'
  - 'Local midnight boundary pattern: new Date(now.getFullYear(), now.getMonth(), now.getDate() + N)'

requirements-completed: [SRS-01, SRS-06, LIB-01, LIB-02, LIB-03]

# Metrics
duration: ~90min (including context restore from prior session)
completed: 2026-06-29
---

# Phase 05 Plan 02: Cards CRUD Routes, AllCard Client Type, and cardUtils

**Data layer for the library UX: 6 new/updated API routes, AllCard type, 5 api client methods, pure filter+format utils with 13 vitest tests**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-06-29
- **Tasks:** 3 (routes, client, utils)
- **Files modified:** 2 | Files created: 2

## Accomplishments

- Added 5 new Hono routes (`GET /cards`, `GET /cards/:id`, `PATCH /cards/:id`, `PATCH /cards/:id/suspend`, `DELETE /cards/:id`) and updated `GET /cards/due` to filter out suspended cards
- `AllCard` interface extends `DueCard` with SRS stat fields; 5 new `api.*` client methods
- `filterCards` implements multi-dimensional AND filter logic with a dedicated suspended branch
- `formatDueAt` / `formatLastReviewed` pure functions using correct local-day calendar arithmetic
- 13 vitest tests covering all filter and formatter behaviors

## Task Commits

1. **Plans 05-02, 05-03, 05-04 batch** — `4b4c0e8` (feat) — cards CRUD + cardUtils

## Files Created/Modified

- `apps/api/src/routes/cards.ts` — 6 routes; FK-safe delete; conditional audio re-synth; isNull in callback
- `apps/mobile/src/lib/api.ts` — AllCard interface; getAllCards/getCard/updateCard/suspendCard/deleteCard
- `apps/mobile/src/lib/cardUtils.ts` — filterCards, formatDueAt, formatLastReviewed
- `apps/mobile/src/lib/cardUtils.test.ts` — 13 vitest tests (filterCards + formatters)

## Decisions Made

- `isNull`, `desc`, `asc` used only inside relational query callbacks — prevents `noUnusedLocals` tsc error
- `GET /cards/due` and `GET /cards/` registered before `GET /cards/:id` — prevents param shadow
- `DELETE /cards/:id` deletes `reviews` rows first to satisfy `ON DELETE no action` FK constraint
- `formatDueAt` uses `new Date(y, m, d+1)` midnight boundaries; `toDateString()` string comparison fails on Sun→Mon boundaries (alphabetically "Mon" < "Sun")

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Bug] formatDueAt toDateString() boundary bug**

- **Found during:** vitest run
- **Issue:** `toDateString()` string comparison (`due.toDateString() <= todayStr`) fails when today is Sunday ("Sun") and tomorrow is Monday ("Mon") because 'M' < 'S' alphabetically — function incorrectly returned "Today" for a +24h timestamp.
- **Fix:** Replaced string comparison with local midnight boundary arithmetic using `new Date(y, m, d+1)` and `new Date(y, m, d+2)`.
- **Files modified:** apps/mobile/src/lib/cardUtils.ts
- **Verification:** All 13 vitest tests pass after fix

---

**Total deviations:** 1 auto-fixed (real correctness bug)

## Next Phase Readiness

- All API routes and client methods available for Plans 05-03 and 05-04
- `AllCard`, `filterCards`, `formatDueAt`, `formatLastReviewed` exported for library and detail screens

## Self-Check

- [x] `apps/api/src/routes/cards.ts` — 6 routes in correct order
- [x] `apps/mobile/src/lib/cardUtils.ts` exists with 3 exports
- [x] `apps/mobile/src/lib/cardUtils.test.ts` — 13 tests, all passing
- [x] Commit `4b4c0e8` exists in git log
- [x] tsc exits 0 (mobile and api packages)

---

_Phase: 05-srs-ux-library_
_Completed: 2026-06-29_
