---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 03-02-PLAN.md — GET /streak/stats route + mobile StreakStats client
last_updated: '2026-06-24T05:32:27.865Z'
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 14
  completed_plans: 12
  percent: 22
---

# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-20)

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 03 — streak-detail-design-fidelity

## Current Position

Phase: 03 (streak-detail-design-fidelity) — EXECUTING
Plan: 4 of 5

- **Status:** Ready to execute
- **Progress:** [█████████░] 86%

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

## Session Continuity

Last session: 2026-06-24T05:37:00.000Z
Stopped at: Completed 03-02-PLAN.md — GET /streak/stats route + mobile StreakStats client
Next: Execute 03-03-PLAN.md (wire streak screen with real data).
Resume file: .planning/phases/03-streak-detail-design-fidelity/03-02-SUMMARY.md

## Decisions

- [Phase ?]: computeRetention returns fraction 0-1; route formats as percentage
- [Phase ?]: computeBestRuns returns [] on no reviews; route renders empty-state row
- [Phase ?]: inWindow is inclusive at both ends (local-day-key granularity) - Plan 02 must match
- [Phase 03-02]: lifetime.longestStreak = max days from computeBestRuns all-time, not computeStreak (which is current-only)
- [Phase 03-02]: retention returned as integer % 0-100 via Math.round(fraction × 100) for hero + all periods
