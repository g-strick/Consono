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

**Plans:** 4/6 plans executed

- [x] 01.1-01-PLAN.md — Design-system foundation: Geist + Geist Mono + Instrument Serif fonts, v6 tokens (cobalt `#1F3494`/fill `#2E5BC8`, gold `#E8B838`, 4-stop heat ramp, OLED), surface-driven text primitives (V6-01, DSGN-01, DSGN-02) · wave 1 ✓ 2026-06-20
- [x] 01.1-02-PLAN.md — Shared components: streak chip (52×26, 3 states + 280ms fill), stat tiles, rating buttons, chips, card/gender-bar surfaces (V6-02) · wave 2 ✓ 2026-06-20
- [x] 01.1-03-PLAN.md — Merged type-detecting Add wizard: single "+ Add", live overridable word/sentence detector, shared image/review/save shell (V6-03) · wave 3 ✓ 2026-06-20
- [x] 01.1-04-PLAN.md — Review loop reskin: intro → audio-only front (gold play, waveform, "O que ouves?") → reveal & rate → cobalt session done; OLED night theme (V6-04, DSGN-01) · wave 3
- [ ] 01.1-05-PLAN.md — Home reskin: three states, surface-driven greeting, cobalt only on due number + key actions, recently-added, streak chip (V6-05, DSGN-02) · wave 3
- [ ] 01.1-06-PLAN.md — Streak detail reskin: period toggle, compact hero, 53w×7d heatmap (4-stop ramp, today outlined), rating distribution bar (V6-06) · wave 3

**Success Criteria:** (verified against the v6 handoff)

1. Geist + Instrument Serif render app-wide; no cobalt-on-white body copy anywhere (text follows surface)
2. A single "+ Add" entry detects word vs. sentence and routes through one shared wizard
3. Review, Home, and Streak detail screens match the v6 layouts and palette
4. Streak corner chip shows 3 states and animates the at-risk→continued fill on session complete

> **Overlap note:** This phase reskins screens that Phases 2 (Review/Home), 3 (Streak/Design-fidelity), and 4 (Add) also touch. Those phases were written against v5 and should be re-scoped to _functional depth on top of v6 surfaces_ (real FSRS session logic, real streak data, audio-speed toggle, source tagging, etc.) — reconcile when planning.

---

## Phase 2: Review Loop + Home States

**Goal:** Review matches v5 design spec. Home shows the right state for every moment of the day.

**Requirements:** RVEW-01, RVEW-02, RVEW-03, RVEW-04, RVEW-05, HOME-01, HOME-02, HOME-03, HOME-04, HOME-05, STRK-01, STRK-02

**Plans:**

1. Audio-first review front (gold play button, waveform, "O que ouves?", Don't know / Reveal)
2. Reveal screen (image, word/stress/gender, sentence + audio, FSRS buttons)
3. Session intro + session done (cobalt surface, stats)
4. Home 4 states (first-run, daily, all-done, streak-at-risk)
5. Real streak chip (3 states + 280ms fill transition on completion)

**Success Criteria:**

1. Review front shows no text or image — only audio play button
2. Home state matches the time of day and deck state correctly
3. Streak chip reflects real streak, transitions visually on session complete
4. Session done screen uses cobalt surface

---

## Phase 3: Streak Detail + Design Fidelity

**Goal:** Streak detail screen fully built. v5 text rules applied across the app.

**Requirements:** STRK-03, STRK-04, STRK-05, STRK-06, DSGN-01, DSGN-02

**Plans:**

1. Streak detail screen — period toggle, hero stats (longest, retention, reviews, days active)
2. GitHub-style heatmap (53w × 7d, 4-stop cobalt ramp, today outlined not filled)
3. Rating distribution stacked bar chart
4. v5 text rule pass — surface-driven text colors throughout app
5. OLED theme (auto night review mode)

**Success Criteria:**

1. Streak detail shows correct stats for month/year/lifetime periods
2. Heatmap renders with correct color ramp and today outlined
3. All body text follows surface rules (no cobalt-on-white body copy)
4. Night review auto-switches to OLED theme

---

## Phase 4: Add Wizard Polish

**Goal:** Add flow is fast, smart, and feels like the v3 design spec.

**Requirements:** ADD-01, ADD-02, ADD-03, ADD-04, ADD-05, ADD-06

**Plans:**

1. Live AI pipeline progress screen (real status: lemma ✓, gender ✓, images 3/4…)
2. Image picker "more" (refresh query) and inline query refinement
3. Sentence inline editing (undo, regenerate audio on save)
4. Source tagging on sentence input + clipboard auto-detect
5. Recent words + frequency list suggestions on word input

**Success Criteria:**

1. AI thinking screen shows real pipeline steps completing live, not a generic spinner
2. User can get different images without leaving the wizard
3. User can edit the selected sentence and hear re-rendered audio
4. Clipboard sentence auto-populates if one is detected on screen open

---

## Phase 5: SRS UX + Library

**Goal:** Power user review control. Library is filterable and editable.

**Requirements:** SRS-01, SRS-02, SRS-03, SRS-04, SRS-05, SRS-06, LIB-01, LIB-02, LIB-03

**Plans:**

1. Suspend / unsuspend cards (from library and card detail)
2. Filtered review session picker (by tag, gender, source)
3. Study ahead + 5-card sprint modes
4. New cards/day limit setting
5. Per-card stats screen (review history, stability, difficulty, next due)
6. Library filters (gender, register, source, SRS state) + inline edit + delete

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
