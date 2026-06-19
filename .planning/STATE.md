# LingoCards — Project State

## Project Reference

See: `.planning/PROJECT.md`

**Core value:** Daily review loop — audio plays, cards appear on schedule.
**Current focus:** Phase 1 — Core Flow Fixed

## Current Position

- **Phase:** 1 of 7 — Core Flow Fixed
- **Status:** All plans complete — pending device test before closing
- **Progress:** ███░░░░░░░ 20%

## Phase 1 Status

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

## Blockers / Concerns

- Sentence audio (CORE-05) requires moving TTS from /generate (word) to approval (finalized sentence); word TTS removed entirely
- Audio currently stored as local file path — blocks Phase 6 (cloud sync)

## Session Continuity

Last session: 2026-06-19
Stopped at: Plan 1.3 complete and committed (8ab1657). All three Phase 1 plans done.
Next: Device-test sentence audio (Plan 1.2) + new user name on Home, then close Phase 1 and advance to Phase 2.
