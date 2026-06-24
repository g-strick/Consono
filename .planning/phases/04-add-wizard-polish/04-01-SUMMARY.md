---
phase: 04-add-wizard-polish
plan: '01'
subsystem: api-generate + mobile-add-wizard
tags: [generate, pipeline, loading-step, pick-image, staged-api]
dependency_graph:
  requires: []
  provides:
    - POST /generate/fields endpoint
    - POST /generate/images endpoint
    - api.generateFields() client method
    - api.generateImages() client method
    - LoadingStep staged pipeline rendering
    - PickImageStep "↻ more" refresh chip
  affects:
    - apps/api/src/routes/generate.ts
    - apps/mobile/src/lib/api.ts
    - apps/mobile/app/(tabs)/add/index.tsx
tech_stack:
  added: []
  patterns:
    - staged two-mutation sequence (fieldsMutation → imagesMutation) with intermediate state
    - pipelineState pattern for intermediate pipeline rendering
    - 409 guard on discarded-only (allows ready_for_review for re-fetch)
key_files:
  created: []
  modified:
    - apps/api/src/routes/generate.ts
    - apps/mobile/src/lib/api.ts
    - apps/mobile/app/(tabs)/add/index.tsx
decisions:
  - 409 guard allows ready_for_review so PickImageStep "↻ more" re-fetch works after first load
  - WordFields type added to api.ts to include image_search_query needed for image re-fetch
  - LoadingStep receives both fieldsComplete bool and full fields object for real value rendering
  - refreshMutation in AddScreen uses stored pipelineFields.pending_card_id + image_search_query
  - imagesMutation.onError sends back to input step to prevent frozen loading screen
  - sentence-kind pre-populate preserved in imagesMutation.onSuccess
metrics:
  duration: ~25 minutes
  completed_date: '2026-06-24'
  tasks_completed: 2
  files_modified: 3
---

# Phase 04 Plan 01: Split /generate staged pipeline + live LoadingStep Summary

Split single blocking POST /generate into two staged endpoints (/fields + /images) and wired LoadingStep to show real pipeline values as each stage resolves, with PickImageStep "↻ more" chip firing a real image re-fetch.

## What Was Built

**Task 1 — API endpoints (apps/api/src/routes/generate.ts)**

Replaced the single `generateRoute.post('/')` handler with two new handlers:

- `POST /generate/fields`: accepts `{ input_text, kind }`, inserts pending_cards row with status 'generating', calls `extractWordFields`, updates draft_json with fields only, returns `{ pending_card_id, fields }`. On error sets status to 'discarded'.
- `POST /generate/images`: accepts `{ pending_card_id, image_search_query }`, reads existing pending_card, blocks only if status is 'discarded' (allows 'generating' and 'ready_for_review' so "↻ more" works), calls `searchImages`, merges images into existing draft_json (preserving fields), sets status 'ready_for_review', returns `{ images }`.

**Task 2 — Client types + mobile wiring (apps/mobile/src/lib/api.ts + add/index.tsx)**

- `api.ts`: Added `WordFields` interface (includes `image_search_query`), `GenerateFieldsResult`, `GenerateImagesResult` interfaces; added `generateFields()` and `generateImages()` methods alongside existing `generate()`.
- `add/index.tsx`: Added `pipelineFields` and `pipelineImages` state. Replaced single `generateMutation` with `fieldsMutation` (calls /fields, on success triggers imagesMutation) + `imagesMutation` (calls /images, on success builds full draft + advances to pick-image) + `refreshMutation` (re-calls generateImages with stored pending_card_id for "↻ more").
- `LoadingStep`: Added `fieldsComplete`, `imageCount`, `fields` props. Renders real lemma/gender/stress/sentences when fieldsComplete, faded placeholders while fields are pending, images counter with brand→good color transition.
- `PickImageStep`: Added `onRefresh` and `refreshLoading` props; the "↻ more" chip is now a TouchableOpacity that calls `onRefresh`, shows ActivityIndicator while refreshLoading.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 409 guard would break "↻ more" re-fetch**

- **Found during:** Task 1 design analysis (advisor review)
- **Issue:** Plan said return 409 if `status !== 'generating'`, but "↻ more" fires after status is already 'ready_for_review'
- **Fix:** Changed guard to only block `status === 'discarded'` (terminal state). 'generating' and 'ready_for_review' are both allowed.
- **Files modified:** apps/api/src/routes/generate.ts
- **Commit:** 3bd1afe

**2. [Rule 2 - Missing type] WordFields type needed image_search_query**

- **Found during:** Task 2 TypeScript analysis
- **Issue:** Plan proposed `GenerateFieldsResult.fields = GenerateDraft['draft']['fields']` but that inline type lacked `image_search_query`. The fieldsMutation→imagesMutation handoff and refreshMutation both read `fields.image_search_query`.
- **Fix:** Extracted `WordFields` interface that mirrors `WordFieldsOutput` (from prompts) including `image_search_query`, then typed `GenerateDraft.draft.fields` and `GenerateFieldsResult.fields` using it.
- **Files modified:** apps/mobile/src/lib/api.ts
- **Commit:** 1d9927b

**3. [Rule 2 - Missing behavior] Sentence-kind pre-populate preserved**

- **Found during:** Task 2 — replacing generateMutation
- **Issue:** Old generateMutation.onSuccess had sentence-kind pre-populate for selectedSentence. imagesMutation.onSuccess needed to replicate this.
- **Fix:** Added `if (kind === 'sentence') setSelectedSentence(pipelineFields.fields.sentence_candidates[0])` in imagesMutation.onSuccess.
- **Files modified:** apps/mobile/app/(tabs)/add/index.tsx
- **Commit:** 1d9927b

**4. [Rule 2 - Missing error path] imagesMutation.onError sends back to input**

- **Found during:** Task 2
- **Issue:** If image fetch fails, user would be frozen on loading screen with no recovery
- **Fix:** Added `onError: () => setStep('input')` to imagesMutation
- **Files modified:** apps/mobile/app/(tabs)/add/index.tsx
- **Commit:** 1d9927b

## Commits

| Task | Commit  | Description                                                                |
| ---- | ------- | -------------------------------------------------------------------------- |
| 1    | 3bd1afe | feat(04-01): split /generate into /fields + /images endpoints              |
| 2    | 1d9927b | feat(04-01): wire staged pipeline to LoadingStep and PickImageStep refresh |

## Known Stubs

None — all pipeline rows render real values from resolved mutations.

## Threat Flags

No new network endpoints or auth paths beyond the two endpoints described in the threat model. T-04-01 through T-04-04 mitigations are in place (Zod validation on both endpoints, 409 guard on discarded-only, no SQL/shell injection surface).

## Self-Check: PASSED

- apps/api/src/routes/generate.ts: FOUND (modified, contains /fields and /images handlers)
- apps/mobile/src/lib/api.ts: FOUND (modified, exports GenerateFieldsResult, GenerateImagesResult, generateFields, generateImages)
- apps/mobile/app/(tabs)/add/index.tsx: FOUND (modified, contains fieldsMutation, imagesMutation, pipelineState)
- Commits 3bd1afe and 1d9927b: FOUND in git log
- API TypeScript: clean (exit 0)
- Mobile TypeScript: clean (exit 0)
