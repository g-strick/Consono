---
phase: 02-review-loop-home-states
plan: 02
subsystem: ui
tags: [react-native, expo, tanstack-query, home-screen, streak]

# Dependency graph
requires:
  - phase: 02-01
    provides: 'GET /home/summary endpoint, HomeSummary/RecentCard types, api.getHomeSummary() client method'
provides:
  - 'Home screen wired to real backend data: four states by deck/due/time, real streak (count + state, no 6pm gate), real today stats + accuracy, live next-batch countdown, recently-added = most-recently-created cards, real user name'
affects: [03-add-word-flow, any future Home screen changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-query pattern: ['cards','due'] + ['users','me'] + ['home','summary'] for Home screen composition"
    - "computeNextBatchLabel(nextDueAt): pure date-math helper returning 'next batch · Xm' or 'next batch · Xh'"
    - 'getStreakState: uses streak.active + streak.reviewedToday, no time gate (D-03)'

key-files:
  created: []
  modified:
    - apps/mobile/app/(tabs)/index.tsx

key-decisions:
  - 'AllDoneState does not show recently-added cards (plan H.1 spec: today stats only, no recently-added in all-done)'
  - 'Tasks 1 and 2 committed together because both modify only index.tsx and were implemented atomically'
  - 'pnpm-lock.yaml committed alongside code changes (autoInstallPeers setting realignment from concurrent installs)'

patterns-established:
  - 'State precedence: isLoading → isError → totalCards===0 (EmptyState) → dueCount>0 (DailyPickup) → AllDone'
  - 'Streak state: inactive if !streak.active; continued if reviewedToday; at-risk if dueCount>0; continued otherwise'

requirements-completed: [HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, STRK-01]

# Metrics
duration: 90min (includes extended pnpm install debugging)
completed: 2026-06-22
---

# Phase 02 Plan 02: Home States Wiring Summary

**Home screen wired to /home/summary: four states driven by real totalCards/due/streak data, live accuracy + next-batch countdown, and recently-created cards via RecentCard[]**

## Performance

- **Duration:** ~90 min (most time spent resolving competing pnpm install processes)
- **Started:** 2026-06-22T14:37:00Z
- **Completed:** 2026-06-22T15:11:00Z
- **Tasks:** 2 of 3 committed (Task 3 is human-verify checkpoint)
- **Files modified:** 2 (apps/mobile/app/(tabs)/index.tsx, pnpm-lock.yaml)

## Accomplishments

- Added `useQuery(['home', 'summary'])` consuming `api.getHomeSummary()` for all summary data
- Fixed state precedence so EmptyState only renders when `totalCards === 0` (was unreachable `dueCount === 0 && !data`)
- Removed 6pm time gate from `getStreakState`; streak state now uses `streak.active` + `streak.reviewedToday`
- Real streakCount from `homeSummary?.streak.count ?? 0` (was hardcoded `1`)
- `AllDoneState` shows real `todayStats.reviewed` and computed `accuracy = Math.round((reviewed-again)/reviewed*100)+'%'`
- `computeNextBatchLabel(nextDueAt)` computes live countdown from ISO timestamp to "next batch · Xm/Xh"
- `DueTile` allDone branch uses computed label (was hardcoded "next batch · 4h")
- `recentCards` sourced from `homeSummary?.recentCards` (RecentCard[] sorted by created_at, not due cards)
- `greeting` uses `me?.name` from `/users/me` query (never the hardcoded literal 'Léo')

## Task Commits

Tasks 1 and 2 were committed together (single file, implemented atomically):

1. **Tasks 1+2: Wire home-summary query, fix streak/state, real stats + countdown** - `606c68e` (feat)

**Plan metadata:** (created after checkpoint)

## Files Created/Modified

- `apps/mobile/app/(tabs)/index.tsx` - Home screen wired to real API data, all placeholders replaced
- `pnpm-lock.yaml` - autoInstallPeers setting alignment (concurrent install conflict resolved)

## Decisions Made

- AllDoneState does not include recently-added cards — plan spec H.1 shows today stats only; RecentlyAdded only appears in DailyPickupState (H.2)
- Tasks 1 and 2 committed as one atomic commit because both changes are in the same file and were implemented together; splitting would require interactive `git add -p` with no safety benefit
- pnpm-lock.yaml included in the commit because concurrent pnpm installs during the session changed the `autoInstallPeers` setting in the lockfile — committing keeps the lockfile consistent with what the project needs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `recentCards` prop from AllDoneState**

- **Found during:** Task 2 (pre-commit ESLint hook)
- **Issue:** `recentCards: RecentCard[]` was in `AllDoneState` props but never used in the function body; ESLint `no-unused-vars` blocked the commit
- **Fix:** Removed `recentCards` from `AllDoneState` props and from the call site in `HomeScreen`. The prop was added by mistake — per plan spec H.1, AllDoneState shows today stats only, not recently-added
- **Files modified:** apps/mobile/app/(tabs)/index.tsx
- **Verification:** `corepack pnpm --filter mobile typecheck` passed; ESLint pre-commit hook passed
- **Committed in:** `606c68e` (combined task commit)

**2. [Deviation - Combined tasks] Tasks 1 and 2 committed together**

- **Found during:** Pre-commit planning
- **Issue:** Both tasks modify only `apps/mobile/app/(tabs)/index.tsx`; changes were implemented atomically in one editing session
- **Fix:** Single commit covering both tasks with clear message documenting which changes belong to each task
- **Impact:** No functional impact; commit message clearly delineates task boundaries

---

**Total deviations:** 2 (1 bug fix, 1 combined-commit process deviation)
**Impact on plan:** Bug fix required for ESLint compliance. Combined commit is a minor process deviation with no functional impact.

## Issues Encountered

- Extended pnpm install conflict: two concurrent pnpm installs (one triggered by `--filter mobile typecheck` pre-install check, one manually started with `--no-frozen-lockfile`) competed and corrupted each other's virtual store. The first install locked `autoInstallPeers: false` in the lockfile, causing the second to fail with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`. Resolution: killed the stuck process after 22 minutes, ran `pnpm install --no-frozen-lockfile` fresh, which completed in 1m 33s.

## Known Stubs

None — all previously hardcoded values replaced with real data. `computeNextBatchLabel` returns `'next batch · —'` when `nextDueAt` is null, which is intentional fallback behavior.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

## Next Phase Readiness

- Task 3 (human-verify on device) is the pending checkpoint — requires starting API and Expo app and walking through all four Home states
- After checkpoint approval, Phase 02-03 (review-session screen) can proceed

---

_Phase: 02-review-loop-home-states_
_Completed: 2026-06-22_
