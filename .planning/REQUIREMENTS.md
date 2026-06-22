# Requirements: LingoCards

**Defined:** 2026-06-02
**Core Value:** The daily review loop must work reliably — audio plays, cards appear on schedule.

## v1 Requirements

### Core Flow

- [x] **CORE-04**: Sentence audio plays on review card front
- [x] **CORE-05**: Sentence audio is generated during card approval; it is the card's only audio asset and plays on both front and reveal

### Review

- [ ] **RVEW-01**: Review front shows only a gold play button and "O que ouves?" — no word, no image
- [ ] **RVEW-02**: Reveal shows image, gendered word, stress marker (display-only), sentence, single sentence-audio control, and FSRS rating buttons
- [ ] **RVEW-03**: Session intro shows card count, breakdown (new/learning/review), and estimated time
- [ ] **RVEW-04**: Session done screen uses cobalt surface; shows reviewed count, accuracy, time, streak delta
- [ ] **RVEW-05**: Audio speed toggle on front (0.7×, 1.0×, 1.2×)

### Home

- [ ] **HOME-01**: First-run state when deck is empty (prompt + word suggestions)
- [ ] **HOME-02**: Daily pickup state — due count, est. time, recently added word, Start review button
- [ ] **HOME-03**: All-done state — next batch time, today's session stats, Add a word + Study ahead
- [ ] **HOME-04**: Streak-at-risk state — triggers after 6pm when queue not yet done
- [ ] **HOME-05**: Real user name via /users/me endpoint (removes hardcoded "Léo")

### Streak

- [ ] **STRK-01**: Streak chip shows real count; 3 states: continued (filled cobalt), at-risk (outline), inactive (gray)
- [ ] **STRK-02**: Chip animates at-risk → continued on session complete (280ms fill, no scale/bounce)
- [ ] **STRK-03**: Streak detail screen with period toggle (month / year / lifetime), default year
- [ ] **STRK-04**: GitHub-style activity heatmap (53w × 7d, 4-stop cobalt ramp)
- [ ] **STRK-05**: Rating distribution stacked horizontal bar (semantic colors: again/hard/good/easy)
- [ ] **STRK-06**: Personal bests grid (longest streak, total reviews, days active, retention %)

### Add Wizard Polish

- [ ] **ADD-01**: AI thinking screen shows real pipeline state (lemma ✓, gender ✓, images 3/4…)
- [ ] **ADD-02**: Image picker has "more" button to refresh search with different query
- [ ] **ADD-03**: Sentence inline editing with undo, regenerate, and play audio
- [ ] **ADD-04**: Source tagging on sentence input (whatsapp, instagram, netflix, + custom)
- [ ] **ADD-05**: Clipboard auto-detect on sentence input screen
- [ ] **ADD-06**: Recent words shown on word input screen

### SRS UX

- [ ] **SRS-01**: User can suspend a card (removed from review queue until unsuspended)
- [ ] **SRS-02**: Filtered review session — pick by tag, gender, or source before starting
- [ ] **SRS-03**: Study ahead — review cards scheduled for later today / tomorrow
- [ ] **SRS-04**: 5-card sprint — short session surfaced on streak-at-risk home state
- [ ] **SRS-05**: New cards per day limit configurable in settings
- [ ] **SRS-06**: Per-card stats screen (review history, current stability, difficulty, next due)

### Cards Library

- [ ] **LIB-01**: Filter cards by gender, register, source tag, SRS state (new/learning/review/suspended)
- [ ] **LIB-02**: Edit card fields inline (sentence, stress marker, usage context)
- [ ] **LIB-03**: Delete card with confirmation

### Design Fidelity

- [ ] **DSGN-01**: OLED theme auto-triggers for night reviews (system dark mode + time-based)
- [ ] **DSGN-02**: v5 text rules applied — surface-driven; cobalt only on numbers, key actions, active states

### v6 Visual Redesign (whole-app reskin — Phase 1.1)

Visual + structural reskin of the whole app to the v6 handoff (`wireframes/Wireframes v6.html`). Client-only; no new server endpoints.

- [ ] **V6-01**: Design-system foundation — Geist (UI) + Geist Mono + Instrument Serif (display) fonts loaded app-wide; v6 token palette (cobalt `#1F3494`/fill `#2E5BC8`, gold `#E8B838`, 4-stop heat ramp, OLED) in theme + Tailwind; "text follows surface, not brand" rule as reusable text primitives
- [ ] **V6-02**: Shared component kit — streak corner chip (52×26, 3 states + 280ms fill transition), brand-tint stat tiles, semantic FSRS rating buttons, chips, card/gender-bar surfaces
- [ ] **V6-03**: Merged type-detecting Add wizard — single "+ Add" entry, live word/sentence detector (overridable via chip), shared image/review/save shell; word path adds the i+1 sentence step (word=4 steps, sentence=3)
- [ ] **V6-04**: Review loop reskin — intro → audio-only front (gold play button, waveform, "O que ouves?", speed hint) → reveal & rate → filled-cobalt session done with streak tick
- [ ] **V6-05**: Home reskin — light surface, surface-driven greeting, three states (continued/daily/inactive), cobalt only on due number + key actions + active tab + brand chips, recently-added word, corner streak chip
- [ ] **V6-06**: Streak detail reskin — period toggle (default year), compact hero, 2×2 stat grid, 53w×7d heatmap (4-stop ramp, today outlined not filled), reviews bar chart, rating distribution stacked bar, personal bests

### Auth & Sync

- [ ] **AUTH-01**: User can sign up and log in with email/password (Supabase Auth)
- [ ] **AUTH-02**: Cards and review history sync across devices via Supabase
- [ ] **AUTH-03**: Audio files stored in Supabase Storage (removes local file path dependency)

### Import / Export

- [ ] **IMEX-01**: Import word list from CSV (own format — word column, optional notes); AI processes each row
- [ ] **IMEX-02**: Export all cards to CSV (word, gender, sentence, stress, tags, SRS state)
- [ ] **IMEX-03**: Import from Anki text export (.txt / .csv with front/back columns)

## v2 Requirements

- iOS share sheet extension (capture from anywhere)
- Push notifications for streak at risk
- TTS voice selection in settings
- Retention curve / forgetting curve visualization
- FSRS custom parameters (target retention %)

## Out of Scope

| Feature             | Reason                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Android             | iOS-first; Expo makes it possible later but not now                    |
| Multi-user / social | Personal tool                                                          |
| Full .apkg import   | SQLite + media bundle, too complex; CSV export from Anki is sufficient |
| Web app             | Mobile only                                                            |
| Other languages     | Portuguese only for now                                                |

## Traceability

| Requirement | Phase     | Status   |
| ----------- | --------- | -------- |
| CORE-04     | Phase 1   | Complete |
| CORE-05     | Phase 1   | Complete |
| V6-01–06    | Phase 1.1 | Pending  |
| DSGN-01–02  | Phase 1.1 | Pending  |
| RVEW-01–05  | Phase 2   | Pending  |
| HOME-01–05  | Phase 2   | Pending  |
| STRK-01–02  | Phase 2   | Pending  |
| STRK-03–06  | Phase 3   | Pending  |
| ADD-01–06   | Phase 4   | Pending  |
| SRS-01–06   | Phase 5   | Pending  |
| LIB-01–03   | Phase 5   | Pending  |
| AUTH-01–03  | Phase 6   | Pending  |
| IMEX-01–03  | Phase 7   | Pending  |

> DSGN-01/02 are first delivered as v6 surfaces in Phase 1.1; Phase 3 re-scopes to functional depth (real OLED trigger data, app-wide text-rule audit) on top of those surfaces.

**Coverage:**

- v1 requirements: 35 + 6 (V6-01…06) = 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---

_Requirements defined: 2026-06-02 · V6 reqs added 2026-06-20 during Phase 1.1 planning_
