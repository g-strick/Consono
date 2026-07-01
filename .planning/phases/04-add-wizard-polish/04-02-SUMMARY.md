---
phase: 04-add-wizard-polish
plan: 02
subsystem: ui
tags: [react-native, expo, textinput, useState, add-wizard, review-step]

# Dependency graph
requires:
  - phase: 04-01
    provides: staged pipeline with fields/images split; ReviewStep already shows selectedSentence
provides:
  - ReviewStep sentence inline editing with editingSentence/editDraft/previousSentence state
  - onSentenceEdit callback prop wired from AddScreen setSelectedSentence
  - Undo/Save-edit button row (conditional on editingSentence state)
  - TextInput in both word-kind (13px) and sentence-kind (18px) card variants
affects: [04-03, 04-04, any plan that touches ReviewStep or add/index.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Controlled TextInput in card body: fontFamily fonts.display, color black, dashed border-bottom'
    - 'editingSentence toggle pattern: capture previousSentence on enter, reset on Undo/Save'
    - 'onSentenceEdit callback lifts state from ReviewStep to AddScreen via setSelectedSentence'

key-files:
  created: []
  modified:
    - apps/mobile/app/(tabs)/add/index.tsx

key-decisions:
  - 'Both word-kind (13px) and sentence-kind (18px) use TextInput when editing — no blind spot for sentence mode'
  - 'previousSentence captured at edit-enter time, not dynamically tracked — ensures stable Undo target'
  - 'onSave(selectedSentence) left unchanged — audio synthesis uses final AddScreen state at approval'

patterns-established:
  - 'Inline edit pattern: editingSentence bool + editDraft string + previousSentence string (local to ReviewStep)'
  - 'Callback lift: ReviewStep never touches AddScreen state directly — only via onSentenceEdit prop'

requirements-completed: [ADD-03]

# Metrics
duration: 14min
completed: 2026-06-25
---

# Phase 04 Plan 02: Sentence Inline Editing in ReviewStep

**ReviewStep ✎ button wired to inline TextInput edit mode with Undo and Save-edit in both word-kind and sentence-kind card variants**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-25T01:05:00Z
- **Completed:** 2026-06-25T01:18:56Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Wired the previously no-op ✎ button to enter inline editing mode in ReviewStep
- Both card variants (word-kind and sentence-kind) swap sentence display for a TextInput when editing
- Undo reverts to the exact sentence value at the time editing started (previousSentence)
- Save edit propagates the new text to AddScreen via onSentenceEdit callback → setSelectedSentence
- Audio regeneration at approval is preserved: final onSave(selectedSentence) is unchanged

## Task Commits

Each task was committed atomically:

1. **Task 1: Add inline sentence editing to ReviewStep with undo** - `cd06fc6` (feat)

**Plan metadata:** _(see final docs commit)_

## Files Created/Modified

- `apps/mobile/app/(tabs)/add/index.tsx` - ReviewStep: new props + state + conditional TextInput + Undo/Save-edit row

## Decisions Made

- Word-kind TextInput uses fontSize 13 (matching Body size=13 static display), sentence-kind uses fontSize 18 (matching Display size=18); both use fontFamily fonts.display
- previousSentence is captured once when editing begins, not re-computed — reliable snapshot for Undo
- onSave(selectedSentence) on the main Save CTA is intentionally left unchanged; audio uses the final AddScreen state from onSentenceEdit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] TextInput in sentence-kind card**

- **Found during:** Task 1 (pre-implementation review)
- **Issue:** Plan spec only described TextInput for word-kind card. Sentence-kind card uses Display size=18 instead of Body, and PickSentenceStep is skipped for sentence-kind cards — meaning ReviewStep is the only place to edit the sentence in that flow. Leaving sentence-kind static would break the must-have truth.
- **Fix:** Added a second `editingSentence ? TextInput : Display` conditional in the sentence-kind card branch, using fontSize 18 to match the Display component's size.
- **Files modified:** apps/mobile/app/(tabs)/add/index.tsx
- **Verification:** Both branches confirmed present via grep; tsc exit 0
- **Committed in:** cd06fc6 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical functionality)
**Impact on plan:** Essential fix — sentence-kind cards would have had no editable input without it. No scope creep.

## Issues Encountered

- lint-staged's `pnpm exec lint-staged` failed in worktree because no node_modules existed in worktree root. Resolved by creating a symlink from `worktree/node_modules` → main repo's `node_modules`. This allows husky's PATH injection to work.
- ESLint run during hook took ~3 minutes. Pre-ran eslint+prettier manually, then committed with extended timeout.
- commitlint body-max-line-length (100 chars) triggered on first commit attempt. Shortened body lines.

## Next Phase Readiness

- ReviewStep sentence editing complete — ADD-03 satisfied
- Plan 04-03 (source tagging + clipboard) can proceed independently; it also touches add/index.tsx
- The `onSentenceEdit` callback pattern is established and available for future plans

## Self-Check

- [x] `apps/mobile/app/(tabs)/add/index.tsx` exists and contains editingSentence state
- [x] Commit `cd06fc6` exists in git log
- [x] tsc --noEmit exits 0 from worktree mobile directory

---

_Phase: 04-add-wizard-polish_
_Completed: 2026-06-25_
