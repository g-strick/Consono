---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: 'Phase 01.1 Plan 03 complete — merged type-detecting Add wizard (detectKind.ts + v6 reskin). Commits: 41616a6, 0461d37.'
last_updated: '2026-06-20T21:35:00Z'
progress:
  total_phases: 9
  completed_phases: 0
  total_plans: 6
  completed_plans: 3
  percent: 50
---

# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-20)

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 01.1 — v6-visual-redesign

## Current Position

Phase: 01.1 (v6-visual-redesign) — EXECUTING
Plan: 4 of 6 (Plans 01–03 complete)

- **Phase:** 1.1 of 7 — v6 Visual Redesign (inserted; whole-app reskin to v6 handoff)
- **Status:** Executing Phase 01.1
- **Progress:** █░░░░░░░░░ 14% (1 of 7 phases complete)

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

## Blockers / Concerns

- ⚠️ [Phase 6] Audio currently stored as local file path — blocks cloud sync; must migrate to Supabase Storage

## Session Continuity

Last session: 2026-06-20
Stopped at: Phase 01.1 Plan 03 complete — merged type-detecting Add wizard (detectKind.ts + v6 reskin all steps). Commits 41616a6/0461d37.
Next: Execute Phase 01.1 Plan 04 (next plan in wave).
Resume file: None
