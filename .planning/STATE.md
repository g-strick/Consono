---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planned
stopped_at: Planned Phase 04 — Add Wizard Polish (4 plans)
last_updated: '2026-06-24T19:00:00.000Z'
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 18
  completed_plans: 12
  percent: 33
---

# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-20)

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 04 — add-wizard-polish

## Current Position

Phase: 04 (add-wizard-polish) — READY TO EXECUTE
Plan: 0 of 4

- **Status:** Phase 04 planned — ready to execute
- **Progress:** [███░░░░░░░] 33%

## Phase 4 Status — Planned (Ready to Execute)

| Plan | Description                                                                               | Status    |
| ---- | ----------------------------------------------------------------------------------------- | --------- |
| 4.1  | Split /generate into /fields + /images; live LoadingStep pipeline; PickImageStep "↻ more" | ○ Pending |
| 4.2  | Sentence inline editing in ReviewStep with undo + audio re-generate                       | ○ Pending |
| 4.3  | Source tagging chips + clipboard auto-detect (DB migration required)                      | ○ Pending |
| 4.4  | Recent words in InputStep from /home/summary recentCards                                  | ○ Pending |

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

## Session Continuity

Last session: 2026-06-24T19:00:00.000Z
Stopped at: Planned Phase 04 — 4 plans written for Add Wizard Polish
Next: Execute 04-01-PLAN.md (split /generate into /fields + /images; live pipeline LoadingStep; PickImageStep ↻ more).
Resume file: .planning/phases/04-add-wizard-polish/04-01-PLAN.md

## Decisions

- [Phase ?]: computeRetention returns fraction 0-1; route formats as percentage
- [Phase ?]: computeBestRuns returns [] on no reviews; route renders empty-state row
- [Phase ?]: inWindow is inclusive at both ends (local-day-key granularity) - Plan 02 must match
- [Phase 03-02]: lifetime.longestStreak = max days from computeBestRuns all-time, not computeStreak (which is current-only)
- [Phase 03-02]: retention returned as integer % 0-100 via Math.round(fraction × 100) for hero + all periods
