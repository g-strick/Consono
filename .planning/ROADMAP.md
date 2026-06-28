# LingoCards Roadmap

**Created:** 2026-06-02
**Phases:** 7 (+1 inserted: 1.1) | **Requirements:** 35

---

## Phase 1: Core Flow Fixed ✓ Complete (2026-06-20)

**Goal:** App is usable end-to-end on a real device — add a word, hear audio, complete a review session.
**Branch:** fix/add-wizard-flow

**Requirements:** CORE-04, CORE-05

**Plans:** 3/3 complete

1. Fix tab bar overlapping Next button in Add wizard ✓
2. Generate sentence audio during card approval (backend: `apps/api/src/routes/generate.ts`) ✓
3. Add /users/me endpoint, wire real user name throughout UI ✓

**Success Criteria:** (all verified via UAT 2026-06-20)

1. User can complete full Add wizard on iPhone without UI blocking issues ✓
2. Both word audio and sentence audio play correctly on review reveal ✓
3. Home shows real user name, not "Léo" ✓

---

## Phase 1.1: v6 Visual Redesign (whole app)

**Goal:** The whole app looks like the v6 handoff (`wireframes/Wireframes v6.html`) — one cohesive design system applied across every screen. This is a visual + structural reskin; the deeper feature logic in Phases 2–5 then builds on top of the v6 surfaces.
**Depends on:** Phase 1
**Design source:** `wireframes/Wireframes v6.html` (+ `screenshots/`)

**Requirements:** DSGN-01, DSGN-02 (upgraded v5→v6), V6-01…V6-06

**Plans:** 6/6 plans executed

- [x] 01.1-01-PLAN.md — Design-system foundation: Geist + Geist Mono + Instrument Serif fonts, v6 tokens (cobalt `#1F3494`/fill `#2E5BC8`, gold `#E8B838`, 4-stop heat ramp, OLED), surface-driven text primitives (V6-01, DSGN-01, DSGN-02) · wave 1 ✓ 2026-06-20
- [x] 01.1-02-PLAN.md — Shared components: streak chip (52×26, 3 states + 280ms fill), stat tiles, rating buttons, chips, card/gender-bar surfaces (V6-02) · wave 2 ✓ 2026-06-20
- [x] 01.1-03-PLAN.md — Merged type-detecting Add wizard: single "+ Add", live overridable word/sentence detector, shared image/review/save shell (V6-03) · wave 3 ✓ 2026-06-20
- [x] 01.1-04-PLAN.md — Review loop reskin: intro → audio-only front (gold play, waveform, "O que ouves?") → reveal & rate → cobalt session done; OLED night theme (V6-04, DSGN-01) · wave 3
- [x] 01.1-05-PLAN.md — Home reskin: three states, surface-driven greeting, cobalt only on due number + key actions, recently-added, streak chip (V6-05, DSGN-02) · wave 3
- [x] 01.1-06-PLAN.md — Streak detail reskin: period toggle, compact hero, 53w×7d heatmap (4-stop ramp, today outlined), rating distribution bar (V6-06) · wave 3 ✓ 2026-06-21

**Success Criteria:** (verified against the v6 handoff)

1. Geist + Instrument Serif render app-wide; no cobalt-on-white body copy anywhere (text follows surface)
2. A single "+ Add" entry detects word vs. sentence and routes through one shared wizard
3. Review, Home, and Streak detail screens match the v6 layouts and palette
4. Streak corner chip shows 3 states and animates the at-risk→continued fill on session complete

> **Overlap note:** This phase reskins screens that Phases 2 (Review/Home), 3 (Streak/Design-fidelity), and 4 (Add) also touch. Those phases were written against v5 and should be re-scoped to _functional depth on top of v6 surfaces_ (real FSRS session logic, real streak data, audio-speed toggle, source tagging, etc.) — reconcile when planning.

---

## Phase 2: Review Loop + Home States

**Goal:** Wire real data into the v6 Review loop and Home screen — real streak, the four Home states by deck/time/session data, real today-stats + next-batch, and a Duolingo-style slow-audio replay. (Layouts are locked from Phase 1.1; this phase is data-wiring only.)

**Requirements:** RVEW-01, RVEW-02, RVEW-03, RVEW-04, RVEW-05, HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, STRK-01, STRK-02

**Plans:** 3 plans

- [ ] 02-01-PLAN.md — `/home/summary` aggregation endpoint (pure unit-tested streak + today-stats logic, totalCards/nextDueAt/recentCards) + mobile `getHomeSummary()` client · wave 1
- [ ] 02-02-PLAN.md — Home screen wiring: four states by totalCards/due, real streak chip (no 6pm gate), real today stats + accuracy, live next-batch countdown, recently-added = newest cards, real name · wave 2
- [ ] 02-03-PLAN.md — Review wiring: real streak into intro/done chips (280ms fill on completion), invalidate home summary on done, per-tap turtle slow replay (~0.7×, revised RVEW-05) · wave 2

**Success Criteria:**

1. Review front shows no text or image — only audio play button
2. Home state matches the deck/time/session state correctly (first-run / daily / all-done; at-risk via chip)
3. Streak chip reflects the real streak and transitions visually (at-risk → continued) on session complete
4. Session done screen uses cobalt surface and shows real today-session stats

---

## Phase 3: Streak Detail + Design Fidelity

**Goal:** Streak detail screen fully built with real month/year/lifetime aggregation (stats, heatmaps, rating distribution, personal bests). v5 surface-text rules applied app-wide. DSGN-01 OLED night trigger verified.

**Requirements:** STRK-03, STRK-04, STRK-05, STRK-06, DSGN-01, DSGN-02

**Plans:** 3/5 plans executed

- [x] 03-01-PLAN.md — Pure unit-tested `streakStats.ts` lib: retention (True FSRS, D-09), personal-best runs (D-04/05/06), days-active / reviews-in-window (D-07), per-day counts + quartile heat levels (STRK-03..06) · wave 1
- [x] 03-02-PLAN.md — `GET /streak/stats` route (user-scoped, all-three-periods payload, D-07 windows) + mobile `getStreakStats()` client (STRK-03..06) · wave 2
- [ ] 03-03-PLAN.md — Wire `streak/index.tsx` to real data: hero, 2×2 stat grid, year/month heatmaps, reviews chart, rating distribution, personal bests (D-07/D-08/D-09 + human-verify checkpoint) (STRK-03..06) · wave 3
- [ ] 03-04-PLAN.md — App-wide DSGN-02 surface-text audit (fix everything, D-01) + before→after changelog (D-03); audits streak last (DSGN-02) · wave 4
- [x] 03-05-PLAN.md — DSGN-01 OLED night-trigger verify: extract pure `isOledSurface` predicate + unit-test truth table (DSGN-01) · wave 1

**Success Criteria:**

1. Streak detail shows correct stats for month/year/lifetime periods
2. Heatmap renders with correct color ramp and today outlined
3. All body text follows surface rules (no cobalt-on-white body copy)
4. Night review auto-switches to OLED theme

---

## Phase 4: Add Wizard Polish ✓ Complete (2026-06-25)

**Goal:** Add flow is fast, smart, and feels like the v3 design spec.

**Requirements:** ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06

**Plans:** 4/4 complete

- [x] 04-01-PLAN.md — Split /generate into /fields + /images; live pipeline LoadingStep (lemma ✓ gender ✓ images N/4); PickImageStep "↻ more" re-fetch (ADD-01, ADD-02) · wave 1
- [x] 04-02-PLAN.md — Sentence inline editing in ReviewStep with undo + confirm; audio re-generated at approval (ADD-03) · wave 2
- [x] 04-03-PLAN.md — Source tagging: DB migration + interactive source chips + clipboard auto-detect via expo-clipboard (ADD-04, ADD-05) · wave 3
- [x] 04-04-PLAN.md — Recent words: InputStep real headwords from /home/summary recentCards (ADD-06) · wave 4

**Success Criteria:**

1. AI thinking screen shows real pipeline steps completing live, not a generic spinner
2. User can get different images without leaving the wizard
3. User can edit the selected sentence and hear re-rendered audio
4. Clipboard sentence auto-populates if one is detected on screen open

---

## Phase 5: SRS UX + Library

**Goal:** Power user review control. Library is filterable and editable — suspend/unsuspend is the primary SRS control; the library shows the whole deck with filters, swipe actions, and a card detail screen.

**Requirements:** SRS-01, SRS-06, LIB-01, LIB-02, LIB-03 (in scope) · SRS-02, SRS-03, SRS-04, SRS-05 (deferred to a future phase per 05-CONTEXT.md)

**Plans:** 4 plans

- [ ] 05-01-PLAN.md — DB migration: add nullable `suspended_at` timestamp column to cards + generate/apply Drizzle migration [BLOCKING prerequisite] (SRS-01) · wave 1
- [ ] 05-02-PLAN.md — API + client + pure logic: GET /cards, GET /cards/:id, PATCH /cards/:id (edit sentence/source_tag, conditional audio re-synth), PATCH /cards/:id/suspend, DELETE /cards/:id (FK-safe), /cards/due suspended filter; AllCard type + api methods; cardUtils filterCards + stat formatters + vitest (SRS-01, SRS-06, LIB-01, LIB-02, LIB-03) · wave 2
- [ ] 05-04-PLAN.md — Card detail screen `app/cards/[id].tsx` (six SRS stats, edit sentence + source tag, suspend toggle, delete with confirmation) + `_layout.tsx` GestureHandlerRootView wrap + cards/[id] Stack.Screen registration (SRS-01, SRS-06, LIB-02, LIB-03) · wave 3
- [ ] 05-03-PLAN.md — Library redesign `app/(tabs)/cards/index.tsx`: all-cards list, multi-dimensional filter chips (AND logic), swipe-left suspend/delete via new SwipeableRow, pull-to-refresh, row-tap to detail (SRS-01, LIB-01, LIB-03) · wave 4

> **Deferred this phase (05-CONTEXT.md):** SRS-02 filtered review session picker, SRS-03 study ahead, SRS-04 5-card sprint, SRS-05 new-cards/day limit, and the settings screen are dropped from Phase 5 and moved to a future phase. Only original success criteria 1 and 4 are active targets.

**Success Criteria:**

1. User can suspend a card and it disappears from review queue
2. User can start a review session filtered to one source tag
3. 5-card sprint is surfaced on streak-at-risk home state and completes in under 5 minutes
4. Library filter + edit + delete all work without navigation issues

---

## Phase 6: Auth & Cloud Sync

**Goal:** Cards and audio sync across devices. App works after reinstall.

**Requirements:** AUTH-01, AUTH-02, AUTH-03

**Plans:**

1. Supabase Auth (email/password sign up, log in, session persistence)
2. Row-level security on all DB tables (per-user isolation)
3. Supabase Storage for audio (migrate existing local paths)
4. Cross-device sync verification (add on iPhone, review on iPad)

**Success Criteria:**

1. User can create account, log in on a second device, and see the same cards
2. Audio plays correctly from cloud URL, not local path
3. No data loss on reinstall — everything recovers from Supabase

---

## Phase 7: Import / Export

**Goal:** Get words in fast. Get data out. Basic Anki compatibility.

**Requirements:** IMEX-01, IMEX-02, IMEX-03

**Plans:**

1. CSV import (own format: word column + optional notes, AI processes each row into full card)
2. CSV export (all fields: word, gender, sentence, stress, tags, SRS state, review count)
3. Anki import (text export format: front/back TSV, maps to word + sentence, FSRS initialized as new)

**Success Criteria:**

1. User can import a 50-word CSV and all words are queued for AI processing
2. Export produces a CSV that can be re-imported without data loss
3. Anki text export creates valid cards that appear in review queue

---

## Completed Phases

### Phase 0: v0 Shipped ✓

- Add word wizard (basic)
- FSRS review loop
- Cards library
- Home screen (static)
- API: /generate, /cards, /reviews, /audio/:hash
