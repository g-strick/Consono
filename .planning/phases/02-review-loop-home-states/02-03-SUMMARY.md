---
phase: 02-review-loop-home-states
plan: 03
subsystem: ui
tags: [react-native, expo, expo-av, tanstack-query, review-loop, streak]

# Dependency graph
requires:
  - phase: 02-01
    provides: 'GET /home/summary endpoint, HomeSummary.streak, api.getHomeSummary() client method'
provides:
  - 'Review screen wired to real streak: intro at-risk/continued + done continued chips from /home/summary'
  - "Session completion invalidates ['home','summary'] so Home/streak refresh"
  - 'Per-tap turtle slow-replay (~0.7x, pitch-corrected) on the audio-only front; default playback unchanged'
affects: [any future review-screen changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'playAudioAtRate(url, rate): clone of playAudio with sound.setRateAsync(rate, true) before playAsync'
    - "Intro streak state derived: reviewedToday ? 'continued' : 'at-risk'; done always 'continued'"

key-files:
  created: []
  modified:
    - apps/mobile/app/review/index.tsx

key-decisions:
  - 'Turtle control is per-tap only (D-10) — no sticky state, users.audio_speed untouched'
  - 'Reveal-sentence turtle skipped (optional in plan) — front is the priority; reveal already has a plain play control and adding a rate variant there would restructure the sentence card'
  - 'Tasks 1 and 2 committed together (single file, atomic edit session)'

requirements-completed: [RVEW-01, RVEW-02, RVEW-03, RVEW-04, RVEW-05, STRK-01, STRK-02]

# Metrics
duration: 15min
completed: 2026-06-22
---

# Phase 02 Plan 03: Review Streak + Slow Audio Wiring Summary

**Review intro/done chips now show the real streak from /home/summary, completion refreshes Home, and the front has a per-tap ~0.7x turtle replay replacing the static speed label.**

## Accomplishments

- Added `useQuery(['home','summary'])` (staleTime 30s); `streakCount = homeSummary?.streak.count ?? 0`
- Removed `STREAK_PLACEHOLDER` constant — no placeholder remains
- Intro `StreakChip`: `count={streakCount}`, state `reviewedToday ? 'continued' : 'at-risk'` (D-04)
- Done `StreakChip`: `count={streakCount} state="continued"` (dropped the `+ 1` literal — real post-session count comes from the refreshed cache)
- `exitReview()` now also `invalidateQueries({ queryKey: ['home','summary'] })`
- Added `playAudioAtRate(url, rate)` using `setRateAsync(rate, true)` (pitch-corrected) before play
- Replaced the static `0.7× · 1.0× · 1.2×` label with a compact 🐢 slow `TouchableOpacity` calling `playAudioAtRate(currentCard.sentence_audio_url, 0.7)`
- Default full-speed playback (gold play button + auto-play effect) unchanged; all four v6 layouts preserved

## Task Commits

1. **Tasks 1+2: wire real streak into review chips + per-tap turtle slow replay** — `764ed34` (feat)

## Files Modified

- `apps/mobile/app/review/index.tsx` — streak query/invalidation, slow-replay callback + control

## Decisions Made

- Per-tap turtle only — no sticky/global slow state, `users.audio_speed` not read or written (D-09, D-10)
- Reveal-sentence turtle skipped: plan marked it optional ("only if it does not require restructuring the reveal layout"); the reveal sentence card keeps its plain `▶ play` full-speed control
- Tasks 1 and 2 committed as one atomic commit (same file, single edit session)

## Deviations from Plan

None functional. Lint-staged (prettier/eslint) reformatted the new turtle `TouchableOpacity` on commit — cosmetic only.

## Known Stubs

None. `streakCount` falls back to 0 while the summary query is loading, then renders the real value.

## Threat Flags

None — no new endpoints or packages. Rate is a hardcoded 0.7 (T-02-09 accept); streak data is server-scoped via /home/summary (T-02-08 mitigated).

## Next Phase Readiness

- Task 3 (human-verify on device) is the pending blocking checkpoint: confirm real streak count on intro, audio-only front, working 🐢 slow replay, cobalt done with 280ms fill, and Home refresh after finishing.
- After approval, phase 02 is complete.

---

_Phase: 02-review-loop-home-states_
_Completed: 2026-06-22_
