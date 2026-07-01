# Phase 5: SRS UX + Library - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-27
**Phase:** 5-srs-ux-library
**Areas discussed:** Library screen redesign, Card detail screen (Sprint & study-ahead dropped mid-session, Settings dropped)

---

## Library screen redesign

| Option              | Description                                        | Selected |
| ------------------- | -------------------------------------------------- | -------- |
| All cards           | Show every card in the deck regardless of due date | ✓        |
| Keep due cards only | Library stays as the review queue                  |          |

**User's choice:** All cards

---

| Option              | Description                                                            | Selected |
| ------------------- | ---------------------------------------------------------------------- | -------- |
| Filter chips at top | Horizontally scrollable pill chips — expanded from current state chips | ✓        |
| Filter sheet/modal  | Bottom sheet with all filter options                                   |          |
| You decide          | Researcher/planner picks                                               |          |

**User's choice:** Filter chips at top

---

| Option                  | Description                                    | Selected |
| ----------------------- | ---------------------------------------------- | -------- |
| No search, default sort | Newest-first, no search bar                    |          |
| Add search by word      | Search bar at top filters by headword/sentence |          |
| You decide              | Keep simple, researcher decides                | ✓        |

**User's choice:** You decide

---

| Option                      | Description                                     | Selected |
| --------------------------- | ----------------------------------------------- | -------- |
| Swipe left reveals actions  | iOS-native: swipe left shows Delete (+ Suspend) | ✓        |
| Tap row to open action menu | Context menu with Edit / Suspend / Delete       |          |
| Long-press for actions      | Long-press reveals options inline               |          |

**User's choice:** Swipe left reveals actions

---

## Card detail screen

| Option                                | Description                                               | Selected |
| ------------------------------------- | --------------------------------------------------------- | -------- |
| Yes — unified detail screen           | One screen: preview + SRS stats + suspend + edit + delete | ✓        |
| Stats screen only, actions in library | Stats screen separate; CRUD via library swipes            |          |

**User's choice:** Yes — unified detail screen

---

| Option              | Description                                                          | Selected |
| ------------------- | -------------------------------------------------------------------- | -------- |
| Key metrics only    | Stability, difficulty, state, due date, total reviews, last reviewed | ✓        |
| Full review history | Above + scrollable per-review event log                              |          |
| You decide          | Researcher picks what fits with other content                        |          |

**User's choice:** Key metrics only

---

| Option                     | Description                                                               | Selected |
| -------------------------- | ------------------------------------------------------------------------- | -------- |
| Sentence + source tag only | The fields most likely to need correction                                 | ✓        |
| All text fields            | Full field editing (headword, gender, stress, sentence, source, register) |          |
| You decide                 | Planner determines                                                        |          |

**User's choice:** Sentence + source tag only

---

| Option                          | Description                                       | Selected |
| ------------------------------- | ------------------------------------------------- | -------- |
| Excluded from all review queues | Suspended cards skip /cards/due entirely          | ✓        |
| Excluded from auto-review only  | Available in manually-triggered filtered sessions |          |

**User's choice:** Excluded from all review queues

---

## Scope trim (mid-session)

**User decision:** Remove success criteria 2 and 3 from Phase 5.

- Dropped: SRS-02 (filtered review session), SRS-03 (study ahead), SRS-04 (5-card sprint)
- User stated: "I want to be able to perform all CRUD functions. I don't care about them."
- Also dropped: SRS-05 (new cards/day limit) when asked

---

## Claude's Discretion

- Sort order and search in library (researcher/planner picks; newest-first likely)
- Card detail screen route path (Expo Router convention: `app/cards/[id].tsx`)
- DB column type for suspend (`suspended_at: timestamp` vs `is_suspended: boolean`)

## Deferred Ideas

- SRS-02: Filtered review session picker — future phase
- SRS-03: Study ahead — future phase
- SRS-04: 5-card sprint / streak rescue — future phase
- SRS-05: New cards/day limit setting — future phase
- Settings screen + global audio speed preference — future phase
- Extended card editing (headword, gender, stress, register) — future phase
