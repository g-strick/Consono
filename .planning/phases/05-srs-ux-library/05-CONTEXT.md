# Phase 5: SRS UX + Library - Context

**Gathered:** 2026-06-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the card library a real, fully editable view of the whole deck — and add suspend/unsuspend as the primary SRS control.

**In scope:**

- **SRS-01** — Suspend / unsuspend cards (from library row swipe AND card detail screen)
- **SRS-06** — Per-card stats (shown on the card detail screen: stability, difficulty, SRS state, due date, total reviews, last reviewed)
- **LIB-01** — Library filters: gender, register, source tag, SRS state (including suspended)
- **LIB-02** — Edit card fields from detail screen: sentence + source tag only
- **LIB-03** — Delete card with confirmation

**Out of scope (explicitly deferred this session):**

- SRS-02: Filtered review session picker — future phase
- SRS-03: Study ahead — future phase
- SRS-04: 5-card sprint / streak rescue — future phase
- SRS-05: New cards/day limit setting — future phase
- Settings screen / global audio speed preference — future phase

**ROADMAP plan list impact:** Plans 2, 3, 4 from the Phase 5 plan list (filtered session, study ahead + sprint, new-cards limit) should be removed when planning. The phase now maps to 3 plans: suspend, library full CRUD, and card detail / stats.

</domain>

<decisions>
## Implementation Decisions

### Library screen redesign (LIB-01, LIB-02, LIB-03)

- **D-01:** Library shows **ALL cards** — not just due. The current `getDueCards()` call must be replaced with a new endpoint (e.g. `GET /cards` or `GET /cards/all`) that returns every card for the user regardless of `due_at` or `state`.
- **D-02:** Filter chips at the top — horizontally scrollable pill chips, same visual pattern as the existing state chips but expanded to cover all four dimensions: **gender** (masculine / feminine / common), **source tag** (whatsapp / instagram / netflix / custom), **register** (formal / informal / slang / neutral), **SRS state** (new / learning / review / relearning / suspended). Multiple filters may be active simultaneously (AND logic).
- **D-03:** Delete + Suspend are triggered by **swipe left on a library row** (iOS-native). Inline field edits happen via the card detail screen (tap a row to open it).

### Card detail screen (SRS-01, SRS-06)

- **D-04:** There is a **unified card detail screen** — tapping any library row opens it. It contains:
  1. Word / image preview (headword, gender bar, image thumbnail)
  2. SRS stats (key metrics only — see D-05)
  3. Suspend toggle (toggles suspension state)
  4. Editable fields (see D-06)
  5. Delete action with confirmation
- **D-05:** SRS stats shown = **key metrics only** (no scrollable review history log): stability, difficulty, SRS state, due date, total reviews, last reviewed at.
- **D-06:** Editable fields = **sentence (`sentence_pt`) + source tag (`source_tag`) only**. Headword, gender, stress marker, register are AI-generated and not editable from this screen.
- **D-07:** Suspend behavior: a suspended card is **excluded from ALL review queues** (`GET /cards/due` must filter out suspended cards). Suspended cards remain visible in the library with a `suspended` badge. Unsuspending restores the card to its previous FSRS state and due date (no reschedule).
- **D-08:** The `cards` table currently has **no `suspended` field** — a DB migration is required. Likely a nullable `suspended_at: timestamp` (null = not suspended; timestamp = when it was suspended). Researcher/planner to confirm the column name and type.

### Claude's Discretion

- **Sort / search in library:** Researcher picks the most useful default sort (newest-first by `created_at` is the likely answer) and whether a search bar adds enough value given the filter chips. Keep it simple.
- **New card detail screen route:** Expo Router file-based routing — planner decides the route path (e.g., `app/cards/[id].tsx`).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap

- `.planning/ROADMAP.md` §"Phase 5" — goal, original plan list (note plans 2/3/4 are now dropped per D-context above), success criteria 1 and 4 are the active targets
- `.planning/REQUIREMENTS.md` — SRS-01, SRS-06, LIB-01, LIB-02, LIB-03 (the in-scope requirements); SRS-02/03/04/05 are deferred

### Database schema

- `packages/db/src/schema.ts` — `cards` table: FSRS fields (`due_at`, `stability`, `difficulty`, `state`, `reps`, `lapses`, `last_reviewed_at`), filter fields (`gender`, `register_tag`, `source_tag`). **No `suspended` field exists yet — migration required (D-08).**

### Existing screens & API to extend

- `apps/mobile/app/(tabs)/cards/index.tsx` — current library screen (shows due cards only via `getDueCards()`); Phase 5 replaces the data source and expands filters
- `apps/api/src/routes/cards.ts` — existing cards route; add `GET /cards` (all cards) and extend `GET /cards/due` to exclude suspended cards
- `apps/mobile/src/lib/api.ts` — typed API client; add `getAllCards()` method

### Prior phase patterns to mirror

- `.planning/phases/03-streak-detail-design-fidelity/03-CONTEXT.md` — pure lib pattern (`apps/api/src/lib/`), Hono route structure, TanStack Query key conventions, vitest unit test approach
- `apps/api/src/lib/homeSummary.ts` — aggregation lib pattern to follow for any new API logic
- `apps/api/src/routes/home.ts` — clean Hono route example

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `apps/mobile/app/(tabs)/cards/index.tsx` — has `Filter` type + `filterCards()` helper + chip UI already; extend rather than replace
- `packages/db/src/schema.ts` — `genderEnum`, `registerTagEnum`, `cardStateEnum` already defined; use these for typed filter values
- `apps/mobile/src/lib/api.ts` — `api` singleton with typed methods; add `getAllCards()` and `updateCard()` here
- `apps/mobile/src/lib/theme.ts` — `textColors`, surface tokens; card detail screen uses the same DSGN-02 surface-text rules

### Established Patterns

- API: Hono routes (`apps/api/src/routes/`), Zod-validated input, Drizzle queries; pure aggregation logic in `src/lib/*.ts`
- Mobile: TanStack Query keyed by `['cards', 'all']` for library, `['cards', 'due']` for review (already used); invalidate both on edit/delete/suspend
- Row swipe: no existing swipe-to-delete in the codebase — researcher should check `react-native-gesture-handler` (already a dependency via Expo) for the right approach
- Expo Router: detail screens live at `app/<entity>/[id].tsx`; navigate with `router.push('/cards/123')`

### Integration Points

- `GET /cards/due` must gain a `WHERE suspended_at IS NULL` clause (D-07)
- New `GET /cards` (or `/cards/all`) endpoint returns all user cards, sortable/filterable server-side or returned in full for client-side filtering
- Card detail screen navigates from library row tap; suspend/edit/delete mutations invalidate `['cards', 'all']` and `['cards', 'due']` caches

</code_context>

<specifics>
## Specific Ideas

- User explicitly wants **all CRUD functions** accessible — create (add wizard, existing), read (library), update (card detail edit fields), delete (swipe + detail). This is the guiding principle for the library + detail screen design.
- **Success criteria 1 and 4 only** from the original Phase 5 are active: "suspend a card and it disappears from review queue" and "library filter + edit + delete all work without navigation issues."

</specifics>

<deferred>
## Deferred Ideas

- **SRS-02: Filtered review session picker** (start a session filtered by tag/gender/source) — dropped from Phase 5, future phase
- **SRS-03: Study ahead** (review not-yet-due cards) — dropped from Phase 5, future phase
- **SRS-04: 5-card sprint** (streak rescue mode, surfaced on at-risk home state) — dropped from Phase 5, future phase
- **SRS-05: New cards/day limit setting** — dropped from Phase 5, future phase
- **Settings screen** — no settings screen in this phase; global audio speed preference (deferred from Phase 2 D-10) also deferred
- **LIB-02 extended editing** (headword, gender, stress, register) — user chose sentence + source tag only; broader editing deferred

</deferred>

---

_Phase: 5-srs-ux-library_
_Context gathered: 2026-06-27_
