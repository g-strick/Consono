---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: 'Phase 02 COMPLETE — UAT 5/5 approved on device (real streak count + at-risk→continued 280ms fill, audio-only front, per-tap 🐢 slow replay ~0.7x, cobalt done, Home cache refresh). All 3 plans done (02-01 endpoint, 02-02 home wiring, 02-03 review streak + slow audio). Ready for next phase.'
last_updated: '2026-06-22T18:00:00.000Z'
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
  percent: 22
---

# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-20)

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 02 — review-loop-home-states

## Current Position

Phase: 02 (review-loop-home-states) — ✓ COMPLETE (UAT 5/5)
Plan: 3 of 3 done

- **Status:** Phase 02 verified on device; ready to start next phase
- **Progress:** [██░░░░░░░░] 22% (2/9 phases)

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

## Blockers / Concerns

- ⚠️ [Phase 6] Audio currently stored as local file path — blocks cloud sync; must migrate to Supabase Storage

## Session Continuity

Last session: 2026-06-22T17:33:36.614Z
Stopped at: Completed 02-01-PLAN.md — GET /home/summary endpoint, pure streak/today-stats
logic (15 vitest tests pass), mobile getHomeSummary() client method.
Next: Execute 02-02-PLAN.md (Home screen real data wiring).
Resume file: None
