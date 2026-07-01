---
phase: 05-srs-ux-library
plan: 04
subsystem: ui
tags: [react-native, expo-router, tanstack-query, card-detail, suspend, delete]

# Dependency graph
requires:
  - phase: 05-02
    provides: AllCard type, getCard, updateCard, suspendCard, deleteCard api methods
provides:
  - app/cards/[id].tsx: full card detail screen (6 stat tiles, sentence edit, source chips, suspend, delete)
  - GestureHandlerRootView wrapper in _layout.tsx
  - cards/[id] Stack.Screen route registration
affects: [05-03 (row tap navigation target)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Hooks-first before isNaN(cardId) guard; enabled: !isNaN(cardId) on useQuery'
    - 'Suspend toggle: no confirmation (reversible); delete: Alert.alert with Keep/Delete buttons'
    - 'Inline edit: dashed cobalt border TextInput; Save/Cancel buttons below'
    - 'Invalidate ["cards"], ["home","summary"], and ["cards", cardId] on mutations'

key-files:
  created:
    - apps/mobile/app/cards/[id].tsx
  modified:
    - apps/mobile/app/_layout.tsx

key-decisions:
  - 'GestureHandlerRootView is outermost wrapper (above QueryClientProvider) — required for ReanimatedSwipeable'
  - 'SRS STATE tile shows "Suspended" when suspended_at != null (takes priority over state field)'
  - 'Conditional audio re-synth only on sentence_pt change — source_tag-only edit skips synthesize'
  - 'router.push({ pathname: "/cards/[id]", params: { id } }) object form — required by typedRoutes: true'

patterns-established:
  - 'Hooks before guard pattern for dynamic route screens'

requirements-completed: [SRS-01, SRS-06, LIB-02, LIB-03]

# Metrics
duration: ~60min
completed: 2026-06-29
---

# Phase 05 Plan 04: Card Detail Screen

**Full card detail screen with 6 SRS stat tiles, inline sentence editing, source chips, suspend toggle, and delete — plus GestureHandlerRootView wiring**

## Performance

- **Duration:** ~60 min
- **Completed:** 2026-06-29
- **Tasks:** 2 (detail screen, layout wiring)
- **Files modified:** 1 | Files created: 1

## Accomplishments

- `app/cards/[id].tsx`: renders AllCard data with 6 stat tiles (Stability, Difficulty, SRS State, Due, Reviews, Last Reviewed)
- Inline sentence edit: TouchableOpacity → TextInput with dashed cobalt underline; Save/Cancel
- Source chips: WhatsApp / Instagram / Netflix + custom via `Alert.prompt`
- Suspend toggle calls `api.suspendCard`; delete calls `api.deleteCard` after confirmation
- `_layout.tsx`: added `GestureHandlerRootView` outermost wrapper and `cards/[id]` Stack.Screen

## Task Commits

1. **feat(05-04)** — `bcce357` — card detail screen + GestureHandlerRootView

## Files Created/Modified

- `apps/mobile/app/cards/[id].tsx` — full detail screen
- `apps/mobile/app/_layout.tsx` — GestureHandlerRootView + cards/[id] route

## Decisions Made

- All hooks (useState, useQuery, useMutation) declared before `isNaN(cardId)` guard — Rules of Hooks
- `enabled: !isNaN(cardId)` prevents query firing for invalid IDs
- Suspend mutation: no confirmation alert (action is easily reversible)
- All mutations invalidate `['cards']` + `['home', 'summary']`; update mutation also invalidates `['cards', cardId]`

## Deviations from Plan

None.

## Human Verification Required

⚠️ Plan 05-04 has a `checkpoint:human-verify` task:

- Tap a card row in the library → confirm navigation to detail screen
- Verify 6 stat tiles render with real data
- Test sentence edit (enter, modify, save, cancel)
- Test source chip selection including custom via prompt
- Test suspend toggle (badge changes in library list)
- Test delete (confirm alert, card removed from list)

## Next Phase Readiness

- Detail screen live and routed — library row taps functional
- `GestureHandlerRootView` in place — SwipeableRow gestures will work (05-03)

## Self-Check

- [x] `apps/mobile/app/cards/[id].tsx` exists
- [x] `apps/mobile/app/_layout.tsx` contains GestureHandlerRootView and cards/[id] Screen
- [x] Commit `bcce357` in git log
- [x] tsc exits 0

---

_Phase: 05-srs-ux-library_
_Completed: 2026-06-29_
