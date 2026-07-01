---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 5 all 4 plans committed; awaiting human verification
last_updated: '2026-06-29T03:57:00.000Z'
progress:
  total_phases: 9
  completed_phases: 4
  total_plans: 22
  completed_plans: 22
  percent: 56
---

# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-20)

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 05 — srs-ux-library

## Current Position

Phase: 05 (srs-ux-library) — PENDING HUMAN VERIFY
Plan: 4 of 4 (all committed)
Next: Human verification of 05-03 (library) + 05-04 (card detail), then Phase 06

- **Status:** Phase 05 all plans committed; checkpoints 05-03 and 05-04 await human device testing
- **Progress:** [█████░░░░░] 56%

## Phase 4 Status — ✓ Complete (2026-06-25)

| Plan | Description                                                                               | Status     |
| ---- | ----------------------------------------------------------------------------------------- | ---------- |
| 4.1  | Split /generate into /fields + /images; live LoadingStep pipeline; PickImageStep "↻ more" | ✓ Complete |
| 4.2  | Sentence inline editing in ReviewStep with undo + audio re-generate                       | ✓ Complete |
| 4.3  | Source tagging chips + clipboard auto-detect (DB migration required)                      | ✓ Complete |
| 4.4  | Recent words in InputStep from /home/summary recentCards                                  | ✓ Complete |

## Phase 3 Status — ✓ Complete

| Plan | Description                                                      | Status     |
| ---- | ---------------------------------------------------------------- | ---------- |
| 3.1  | Pure streakStats.ts lib (retention, personal bests, heat levels) | ✓ Complete |
| 3.2  | GET /streak/stats route + mobile getStreakStats() client         | ✓ Complete |
| 3.3  | Wire streak/index.tsx to real data                               | ✓ Complete |
| 3.4  | App-wide DSGN-02 cobalt body-copy audit + fixes                  | ✓ Complete |
| 3.5  | DSGN-01 OLED isOledSurface predicate + truth-table test          | ✓ Complete |

## Phase 2 Status — ✓ Complete (UAT 5/5)

| Plan | Description                                                | Status               |
| ---- | ---------------------------------------------------------- | -------------------- |
| 2.1  | GET /home/summary aggregation + HomeSummary client/types   | ✓ Complete (7521b28) |
| 2.2  | Home screen wired to real data (states/streak/stats/batch) | ✓ Complete (606c68e) |
| 2.3  | Review streak chips + per-tap 🐢 slow replay (~0.7x)       | ✓ Complete (764ed34) |

## Phase 1 Status — ✓ Complete (UAT 5/5)

| Plan | Description                                                | Status                      |
| ---- | ---------------------------------------------------------- | --------------------------- |
| 1.1  | Tab bar fix + flex layout (Add wizard)                     | ✓ Complete (merged to main) |
| 1.2  | Sentence audio at approval; remove word TTS from /generate | ✓ Complete (fa89fef)        |
| 1.3  | /users/me endpoint + real user name                        | ✓ Complete (8ab1657)        |

## Recent Decisions

- Audio-first review front chosen (not text-first) — aligns with v5 design, ear-training focus
- Anki compat via CSV export only (not .apkg) — .apkg too complex
- Auth deferred to Phase 6 — single user, personal tool for now
- OLED theme is time-triggered, not user-toggled
- fonts constants in theme.ts (not inlined in Type.tsx) — single source of truth
- Surface type extended to include 'gold' for accent surface text rules
- Num/Action default to tone=brand; Display/Heading/Body default to tone=primary
- Ionicons does not accept Animated values — icon color static per state, text color interpolated
- RatingButtons default intervals are visual-fidelity placeholders; real FSRS data from Plan 04
- kindOverride is null by default; clearing the field resets it per detector contract
- detectKind test file uses typed node assertions (no @types/jest) — Jest migration is trivial when added
- LoadingStep pipeline rows are static placeholders; live status wired in Phase 4 ADD-01
- Streak uses local-day-key (getFullYear/getMonth/getDate) for D-02 local midnight boundary
- Reviews scoped via inArray(card_id, userCardIds) since reviews table has no user_id (T-02-01)
- recentCards = 3 most-recently-created by created_at desc, not due cards (D-08)
- nextDueAt = earliest future due_at via gt(due_at, now) ordered asc (D-12)
- isOledSurface predicate extracted from useNightSurface — pure fn enables unit testing without React render env (Plan 03-05)
- vi.mock('react-native') pattern for testing RN-importing modules under vitest/node (Plan 03-05)

## Blockers / Concerns

- ⚠️ [Phase 6] Audio currently stored as local file path — blocks cloud sync; must migrate to Supabase Storage

## Phase 5 Status — PENDING HUMAN VERIFY (2026-06-29)

| Plan | Description                                                  | Status               |
| ---- | ------------------------------------------------------------ | -------------------- |
| 5.1  | suspended_at nullable timestamp column + Drizzle migration   | ✓ Complete (d2b169a) |
| 5.2  | Cards CRUD routes, AllCard type, cardUtils filter+formatters | ✓ Complete (4b4c0e8) |
| 5.3  | Library rewrite: filter chips, SwipeableRow, swipe actions   | ✓ Complete (0b54dff) |
| 5.4  | Card detail screen + GestureHandlerRootView wiring           | ✓ Complete (bcce357) |

⚠️ Plans 5.3 and 5.4 have `checkpoint:human-verify` tasks — must verify on device before closing phase.

## Session Continuity

Last session: 2026-06-29T03:57:00.000Z
Stopped at: Phase 05 all 4 plans committed; awaiting device verification of 05-03 + 05-04
Next: Human verify library redesign (05-03) and card detail screen (05-04) on device, then plan Phase 06.
Resume file: .planning/phases/05-srs-ux-library/05-03-SUMMARY.md

## Decisions

- [Phase ?]: computeRetention returns fraction 0-1; route formats as percentage
- [Phase ?]: computeBestRuns returns [] on no reviews; route renders empty-state row
- [Phase ?]: inWindow is inclusive at both ends (local-day-key granularity) - Plan 02 must match
- [Phase 03-02]: lifetime.longestStreak = max days from computeBestRuns all-time, not computeStreak (which is current-only)
- [Phase 03-02]: retention returned as integer % 0-100 via Math.round(fraction × 100) for hero + all periods
