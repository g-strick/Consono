---
phase: 05-srs-ux-library
plan: 03
subsystem: ui
tags: [react-native, reanimated, gesture-handler, swipeable, filter-chips, library]

# Dependency graph
requires:
  - phase: 05-02
    provides: getAllCards, suspendCard, deleteCard api methods; filterCards, AllCard
  - phase: 05-04
    provides: GestureHandlerRootView in _layout.tsx (required for swipe gestures)
provides:
  - SwipeableRow component (suspend + delete right-action panels)
  - Library screen full rewrite: all-cards, filter chips, swipe, pull-to-refresh, 4 content states
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'ReanimatedSwipeable renderRightActions: closes swipeable before calling onSuspend/onDelete'
    - 'FilterChip: active = solid #1F3494; inactive = paperSoft/rgba(0,0,0,0.08)'
    - 'Active suspend badge overrides SRS state badge in CardRow'
    - 'toggle<T> generic helper for chip toggling'
    - 'router.push({ pathname: "/cards/[id]", params: { id } }) object form (typedRoutes)'

key-files:
  created:
    - apps/mobile/src/components/SwipeableRow.tsx
  modified:
    - apps/mobile/app/(tabs)/cards/index.tsx

key-decisions:
  - 'SwipeableRow uses swipeable.close() before invoking handlers — prevents gesture state leak'
  - 'Vulgar register chip excluded from filter UI (included in type but not surface)'
  - 'Custom source tags derived from card data (not hardcoded) — appear alongside canonical chips'
  - 'Pull-to-refresh invalidates ["cards","all"] only (not ["home","summary"] — no summary refresh needed)'

patterns-established:
  - 'SwipeableRow wraps children for gesture isolation; inner TouchableOpacity handles tap'

requirements-completed: [SRS-01, LIB-01, LIB-03]

# Metrics
duration: ~60min
completed: 2026-06-29
---

# Phase 05 Plan 03: Library Screen Rewrite with SwipeableRow

**Library screen shows all cards with multi-dimensional filter chips and swipeable row actions; SwipeableRow component for suspend + delete**

## Performance

- **Duration:** ~60 min
- **Completed:** 2026-06-29
- **Tasks:** 2 (SwipeableRow, library rewrite)
- **Files modified:** 1 | Files created: 1

## Accomplishments

- `SwipeableRow`: ReanimatedSwipeable with two right-action panels — neutral suspend (pause/play icon) and red delete (trash icon); closes before calling handlers
- `app/(tabs)/cards/index.tsx` full rewrite: query changed to `['cards','all']` / `api.getAllCards()`, `ActiveFilters` state, horizontal chip ScrollView (gender / source / register / SRS state), `CardRow` with Suspended badge override, pull-to-refresh, 4 content states
- Row tap navigates to `cards/[id]` detail screen

## Task Commits

1. **feat(05-03)** — `0b54dff` — SwipeableRow + library rewrite

## Files Created/Modified

- `apps/mobile/src/components/SwipeableRow.tsx` — swipeable row with suspend + delete panels
- `apps/mobile/app/(tabs)/cards/index.tsx` — full rewrite

## Decisions Made

- `swipeable.close()` called before `onSuspend`/`onDelete` — prevents stuck gesture state
- Filter chip bar uses `ScrollView horizontal` with all chip groups in sequence
- Custom source tags collected from card data via `Set` to avoid duplicate chips
- `Suspended` badge (muted gray) overrides SRS state badge when `suspended_at != null`

## Deviations from Plan

None.

## Human Verification Required

⚠️ Plan 05-03 has a `checkpoint:human-verify` task:

- Scroll the library — verify all cards load (including suspended)
- Tap filter chips — verify AND logic filters correctly
- Swipe left on a card — confirm suspend and delete action panels appear
- Tap suspend action — verify badge changes (Suspended / SRS state)
- Tap delete action — verify confirmation alert, then removal
- Pull to refresh — verify list reloads
- Tap a card row — verify navigation to detail screen

## Next Phase Readiness

- Library is a fully functional, filterable, editable deck view
- Phase 05 UI goals met pending human verification checkpoints

## Self-Check

- [x] `apps/mobile/src/components/SwipeableRow.tsx` exists
- [x] `apps/mobile/app/(tabs)/cards/index.tsx` uses getAllCards + filterCards
- [x] Commit `0b54dff` in git log
- [x] tsc exits 0

---

_Phase: 05-srs-ux-library_
_Completed: 2026-06-29_
