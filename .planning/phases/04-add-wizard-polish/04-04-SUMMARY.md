---
plan: 04-04
phase: 04-add-wizard-polish
status: complete
commit: 2ea90b1
---

# Plan 04-04 Summary — Recent words in InputStep from recentCards

## What Was Built

Replaced the hardcoded `['saudade', 'ficar', 'já', 'quase']` chips in `InputStep` with live data from the existing `/home/summary` endpoint's `recentCards` array. No new endpoint was needed — the data was already fetched by the home screen.

## Key Changes

- **`apps/mobile/app/(tabs)/add/index.tsx`**
  - Added `useQuery` to tanstack/react-query import
  - Added `useQuery({ queryKey: ['home', 'summary'], staleTime: 60_000 })` in `AddScreen`
  - Derived `recentHeadwords: string[]` from `homeSummary?.recentCards` (filters null headwords, slices to 4)
  - Added `recentHeadwords: string[]` prop to `InputStep`
  - Replaced hardcoded chip array with dynamic render: real headwords when available, "no recent words yet" Body text as empty-state fallback

## Acceptance Criteria

- [x] `useQuery({ queryKey: ['home', 'summary'] })` call in AddScreen
- [x] `recentHeadwords` derived from `homeSummary?.recentCards`
- [x] `InputStep` prop includes `recentHeadwords: string[]`
- [x] Hardcoded `['saudade', 'ficar', 'já', 'quase']` removed (grep returns 0 matches)
- [x] No TypeScript errors introduced in `add/index.tsx`

## Self-Check: PASSED

All task acceptance criteria met. Frequency-list chips (`→ ainda`, `→ porque`, `→ embora`) preserved as static UI scaffolding per ADD-06 scope.
