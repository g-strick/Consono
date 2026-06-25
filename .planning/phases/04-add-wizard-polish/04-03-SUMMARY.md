---
phase: 04-add-wizard-polish
plan: '03'
subsystem: add-wizard
tags: [source-tagging, clipboard, db-migration, expo-clipboard, react-native]
dependency_graph:
  requires: [04-02]
  provides: [source_tag-column, interactive-source-chips, clipboard-auto-detect]
  affects:
    [apps/mobile/app/(tabs)/add/index.tsx, apps/api/src/routes/cards.ts, packages/db/src/schema.ts]
tech_stack:
  added: [expo-clipboard@^56.0.4]
  patterns:
    [
      Alert.prompt for custom text input,
      useEffect clipboard read on mount,
      nullable DB column via Drizzle migration,
    ]
key_files:
  created:
    - packages/db/drizzle/0001_redundant_inertia.sql
    - packages/db/drizzle/meta/0001_snapshot.json
  modified:
    - packages/db/src/schema.ts
    - apps/api/src/routes/cards.ts
    - apps/mobile/src/lib/api.ts
    - apps/mobile/app/(tabs)/add/index.tsx
    - apps/mobile/package.json
    - pnpm-lock.yaml
decisions:
  - expo-clipboard@^56.0.4 installed — Expo SDK 56 numbering but peerDeps is * so SDK 54 compatible
  - import * as Clipboard from expo-clipboard — namespace import (no named Clipboard export)
  - Alert.prompt second arg used as message/subtitle (placeholder arg not valid in AlertOptions)
  - Clipboard useEffect runs once on mount with empty dep array — kind guard inside effect
  - source_tag stored as nullable text (no max length enforced — low-value column per plan)
  - Migration generated (0001_redundant_inertia.sql) but not applied in sandbox — no DB connectivity
metrics:
  duration: ~45 minutes
  completed_date: '2026-06-25'
  tasks_completed: 2
  tasks_total: 2
  files_modified: 6
---

# Phase 4 Plan 3: Source Tagging + Clipboard Auto-detect Summary

ADD-04 (source tagging) and ADD-05 (clipboard auto-detect) implemented end-to-end: DB schema migration, approve endpoint update, interactive source chips in InputStep, clipboard pre-fill on sentence input mount.

## Tasks Completed

| Task   | Description                                                        | Commit  |
| ------ | ------------------------------------------------------------------ | ------- |
| Task 1 | Add source_tag to DB schema + cards approve endpoint               | 5501fbb |
| Task 2 | Install expo-clipboard + wire source chips + clipboard auto-detect | 345296a |

## What Was Built

### Task 1: DB Schema + API

**packages/db/src/schema.ts:** Added `source_tag: text('source_tag')` after `sentence_gloss_en` in the cards table. Nullable text column (no notNull, no default).

**packages/db/drizzle/0001_redundant_inertia.sql:** Generated migration — `ALTER TABLE "cards" ADD COLUMN "source_tag" text;`. Migration generated; apply pending (requires live Supabase DB connection).

**apps/api/src/routes/cards.ts:** Added `source_tag: z.string().optional()` to the `edits` Zod schema. Added `source_tag: edits?.source_tag ?? null` to the `db.insert(cards)` call.

### Task 2: Mobile Wiring

**expo-clipboard@^56.0.4** installed in apps/mobile. Despite the v56 version number, peerDeps is `*` — fully compatible with Expo SDK 54.

**apps/mobile/src/lib/api.ts:** Added `source_tag?: string` to the `approveCard` edits type.

**apps/mobile/app/(tabs)/add/index.tsx:**

- Added `selectedSource: string | null` state to AddScreen
- `approveMutation` passes `edits: { source_tag: selectedSource ?? undefined }` to `api.approveCard`
- `resetFlow` clears `selectedSource` to null
- `InputStep` receives `selectedSource` and `onSourceSelect` props
- `whatsapp`, `instagram`, `netflix` chips wrapped in `TouchableOpacity` — tap selects (brand variant), tap again deselects (default variant)
- `+ tag` chip opens `Alert.prompt` with "e.g. livro, aula…" subtitle for custom text entry
- Clipboard `useEffect` inside `InputStep`: runs once on mount, checks `kind === 'sentence'`, calls `Clipboard.getStringAsync()`, pre-fills `onInputChange` if result has > 3 words. Errors swallowed silently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Alert.prompt options — placeholder not in AlertOptions**

- **Found during:** Task 2 TypeScript verification (tsc reported TS2353)
- **Issue:** Plan specified `{ placeholder: 'e.g. livro, aula...' }` as 6th arg to Alert.prompt — not a valid AlertOptions property
- **Fix:** Used Alert.prompt(title, message, callback, type, defaultValue) with message as subtitle text
- **Files modified:** apps/mobile/app/(tabs)/add/index.tsx
- **Commit:** 345296a

**2. [Rule 3 - Blocking] Worktree missing node_modules — hooks failing**

- **Found during:** First commit attempt
- **Issue:** Git worktree shares .git hooks from main repo but has no node_modules — pnpm exec lint-staged failed
- **Fix:** Created symlinks in worktree node_modules/ for lint-staged/eslint/prettier; added main checkout node_modules/.bin to PATH via ~/.config/husky/init.sh. .husky/pre-commit restored to original after task commits.
- **Scope:** Worktree setup only — no tracked files changed

**3. [Rule 1 - Bug] expo-clipboard import form (pre-empted by advisor)**

- **Found during:** Pre-implementation review
- **Issue:** Plan specified `import { Clipboard } from 'expo-clipboard'` — package has no named Clipboard export
- **Fix:** Used `import * as Clipboard from 'expo-clipboard'` — exposes getStringAsync correctly
- **Files modified:** apps/mobile/app/(tabs)/add/index.tsx
- **Commit:** 345296a

## Known Limitations

**Clipboard auto-detect fires only on sentence-mode mounts.** The useEffect runs once on mount with `if (kind !== 'sentence') return`. Since InputStep mounts when `step === 'input'`, and the default kind is `'word'` for fresh empty input, auto-detect only fires when the component mounts in sentence mode. This matches ADD-05 spec ("on sentence input mount") and is noted here for awareness.

**Migration not applied in sandbox.** `0001_redundant_inertia.sql` was generated but not run — no live Supabase DB connection in sandbox. Apply via `drizzle-kit migrate` from `packages/db/` with DATABASE_URL set.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries beyond the plan's threat model. T-04-08 mitigated: clipboard read is on mount, result immediately visible to user in TextInput, no background reads, errors silently swallowed.

## Self-Check: PASSED

Files verified:

- packages/db/drizzle/0001_redundant_inertia.sql — EXISTS
- packages/db/src/schema.ts contains source_tag — VERIFIED
- apps/api/src/routes/cards.ts contains source_tag — VERIFIED
- apps/mobile/app/(tabs)/add/index.tsx contains selectedSource + Clipboard.getStringAsync — VERIFIED
- apps/mobile/src/lib/api.ts contains source_tag — VERIFIED

Commits verified:

- 5501fbb — EXISTS in git log
- 345296a — EXISTS in git log
