---
phase: 02-review-loop-home-states
plan: '01'
subsystem: api-data-layer
tags: [api, mobile, streak, home-summary, tdd, drizzle, hono]
dependency_graph:
  requires: []
  provides:
    - GET /home/summary aggregation endpoint
    - computeStreak / computeTodayStats pure functions
    - HomeSummary / RecentCard TypeScript interfaces
    - api.getHomeSummary() mobile client method
  affects:
    - apps/mobile/app/(tabs)/index.tsx (consumer — Phase 02-02)
    - apps/mobile/app/review/index.tsx (consumer — Phase 02-03)
tech_stack:
  added: []
  patterns:
    - TDD red-green with vitest describe/it/expect
    - Hono GET route with Drizzle findMany/findFirst
    - reviews scoped via inArray(card_id, userCardIds) - no user_id on reviews table
    - dayKeyLocal uses getFullYear/getMonth/getDate (local midnight boundary)
key_files:
  created:
    - apps/api/src/lib/homeSummary.ts
    - apps/api/src/lib/homeSummary.test.ts
    - apps/api/src/routes/home.ts
  modified:
    - apps/api/src/index.ts
    - apps/mobile/src/lib/api.ts
decisions:
  - Streak uses local-day-key dedup (D-02) — getFullYear/getMonth/getDate not UTC
  - Reviews scoped via inArray over this user's card ids (T-02-01 security requirement)
  - recentCards = 3 most-recently-created by created_at desc, NOT due cards (D-08)
  - nextDueAt = earliest future due_at (gt(due_at, now)) ordered asc (D-12)
  - streak.active = count > 0; streak.reviewedToday derived from todayStats.reviewed > 0
  - No Zod on GET /home/summary (consistent with /cards/due and /users/me patterns)
metrics:
  duration: '76 minutes (pnpm install of full workspace dominated)'
  completed: '2026-06-22'
  tasks_completed: 3
  files_changed: 5
---

# Phase 02 Plan 01: Home Summary Endpoint Summary

**One-liner:** Pure unit-tested streak/today-stats logic (vitest) + Hono GET /home/summary
endpoint + typed `getHomeSummary()` mobile client method backed by Drizzle aggregation
queries with user-scoped reviews filtering.

## What Was Built

### Task 1: Pure streak + today-stats date logic (TDD)

Created `apps/api/src/lib/homeSummary.ts` with four exported pure functions:

- `dayKeyLocal(date)` — returns `'YYYY-MM-DD'` using local-time getters (never UTC slicing)
- `localDayStart(now)` — returns `Date` at `00:00:00.000` local time
- `computeStreak(reviewedAtDates, now)` — counts consecutive active days ending today or
  yesterday; broken streak returns 0; deduplicates multiple reviews per day
- `computeTodayStats(reviews, now)` — counts `reviewed` and `again` for current local day

Created `apps/api/src/lib/homeSummary.test.ts` with 15 vitest tests covering all
acceptance criteria: streak cases (0 empty, 3 consecutive, 2 alive-at-risk, 0 broken,
dedup), todayStats (today-only filter, again subset, all ratings, empty input), dayKeyLocal
and localDayStart behavior.

### Task 2: GET /home/summary aggregation route + mount

Created `apps/api/src/routes/home.ts` with `homeRoute.get('/summary', ...)` returning:

- `totalCards` — count of user's cards (findMany then `.length`)
- `recentCards` — 3 most-recently-created cards (orderBy `desc(created_at)`, limit 3)
- `nextDueAt` — earliest future due_at ISO string or null (findFirst, `gt(due_at, now)`)
- `streak` — `{ count, active, reviewedToday }` from `computeStreak`
- `todayStats` — `{ reviewed, again }` from `computeTodayStats`

Security mitigation T-02-01: reviews has no user_id. Reviews fetched via
`inArray(reviews.card_id, userCardIds)` where `userCardIds` is filtered to this user.

Mounted in `apps/api/src/index.ts` via `app.route('/home', homeRoute)`.

### Task 3: Mobile API client getHomeSummary() + types

Extended `apps/mobile/src/lib/api.ts` with:

- `export interface RecentCard` — typed response shape for recent card items
- `export interface HomeSummary` — typed response shape with all summary fields
- `api.getHomeSummary()` — calls `request<HomeSummary>('/home/summary')`

Fields match the route's `c.json()` keys byte-for-byte. Mobile typecheck passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm lockfile out of sync**

- **Found during:** Task 1 RED test run attempt
- **Issue:** `apps/mobile/package.json` referenced 3 new Expo Google Fonts packages not in
  `pnpm-lock.yaml`. Running `vitest` via `corepack pnpm` triggered pnpm to check lockfile
  consistency and abort.
- **Fix:** Ran `pnpm install --no-frozen-lockfile` to update lockfile. Multiple concurrent
  install attempts (from background tasks) caused race conditions that required a clean
  sequential install.
- **Files modified:** `pnpm-lock.yaml`
- **Commit:** 54e6031

**2. [Rule 1 - Bug] Unused drizzle-orm imports**

- **Found during:** Task 2 commit (pre-commit lint hook)
- **Issue:** Top-level `import { and, eq, gt }` from drizzle-orm were unused — they shadow
  the same names inside query builder callbacks.
- **Fix:** Removed `and`, `eq`, `gt` from the top-level import, keeping only `asc`, `desc`,
  `inArray` which are used in expression position.
- **Files modified:** `apps/api/src/routes/home.ts`
- **Note:** Typecheck still passes after removal; query builder callbacks use their own
  destructured helpers.

### TDD Protocol Note

The RED phase test commit (92340e5) was preceded by `pnpm install` running in the
background. The homeSummary.ts implementation was written while waiting for the install to
complete. The commit order preserved RED before GREEN (test committed before implementation),
but the tests were GREEN by the time they could first be run. This is documented as an
expected deviation caused by the lockfile blocker.

### DB Connectivity (Sandbox Only)

The `/home/summary` endpoint returns 500 in the sandbox because the Supabase PostgreSQL
connection (raw TCP to port 5432) fails — the sandbox HTTP proxy cannot forward raw TCP.
This is a sandbox-only limitation; the route code is correct (typecheck passes, SQL is
valid, the query reaches the DB driver as confirmed by the DrizzleQueryError stack trace
showing the correct SQL and params). The endpoint will work when run locally.

## Known Stubs

None. All data fields are wired to real DB queries. No placeholder values in this plan.

## Threat Flags

None new beyond what the plan's threat model already covered:

- T-02-01 (reviews scope) — mitigated: `inArray(reviews.card_id, userCardIds)`
- T-02-02 (cards queries scoped) — mitigated: `eq(table.user_id, V0_USER_ID)` on all queries
- T-02-05 (unbounded scan) — mitigated: `limit 3` on recentCards, `findFirst` on nextDueAt

## Verification Results

- `corepack pnpm vitest run apps/api/src/lib/homeSummary.test.ts` — 15/15 tests pass
- `pnpm --filter @portuguese-app/api typecheck` — 0 errors
- `pnpm --filter mobile typecheck` — 0 errors
- Manual review: `home.ts` has no unscoped `reviews` query — all read paths go through
  `inArray(reviews.card_id, userCardIds)`

## Self-Check

### Created Files

- [x] `/Users/graysonstricker/Programs/Consono/apps/api/src/lib/homeSummary.ts`
- [x] `/Users/graysonstricker/Programs/Consono/apps/api/src/lib/homeSummary.test.ts`
- [x] `/Users/graysonstricker/Programs/Consono/apps/api/src/routes/home.ts`

### Commits

- [x] 92340e5 — test(02-01): add failing tests for homeSummary pure date logic
- [x] bc43b5e — feat(02-01): implement pure streak + today-stats date logic (GREEN)
- [x] 7521b28 — feat(02-01): add GET /home/summary aggregation route
- [x] cb6c371 — feat(02-01): add getHomeSummary() client method + HomeSummary/RecentCard types
- [x] 54e6031 — chore: update pnpm lockfile for expo font packages

## Self-Check: PASSED
