# LingoCards

## What This Is

A personal spaced-repetition flashcard app for Brazilian Portuguese vocabulary. AI generates card content (lemma, gender, stress, sentence, audio, images) from a word or sentence — the user picks and edits, then reviews daily with FSRS scheduling. Designed for one person's serious language study, built to eventually sync across devices.

## Core Value

The daily review loop must work reliably. If cards don't show up on schedule and audio doesn't play, nothing else matters.

## Requirements

### Validated

- ✓ AI card generation (LLM + TTS + image search) — v0
- ✓ Add word wizard (input → loading → pick image → pick sentence → review → save) — v0
- ✓ FSRS scheduling after each review — v0
- ✓ Cards library screen — v0
- ✓ Basic home screen — v0
- ✓ CORE-04: Sentence audio plays on review card front — Phase 1
- ✓ CORE-05: Sentence audio generated and plays on reveal — Phase 1
- ✓ HOME-05: Real user name from /users/me endpoint — Phase 1

### Active

**Review**

- [ ] RVEW-01: Review front is audio-only (play button, no text or image)
- [ ] RVEW-02: Reveal shows image, word, stress, sentence, sentence audio, FSRS buttons
- [ ] RVEW-03: Session intro shows card count + estimated time
- [ ] RVEW-04: Session done screen on cobalt surface with stats (reviewed, accuracy, time, streak)
- [ ] RVEW-05: Audio playback speed toggle (0.7×, 1.0×, 1.2×)

**Home**

- [ ] HOME-01: First-run state (empty deck, prompt to add)
- [ ] HOME-02: Daily pickup state (due count, estimated time, recently added)
- [ ] HOME-03: All-done state (next batch time, today's session stats)
- [ ] HOME-04: Streak-at-risk state (after 6pm, queue not done)

**Streak**

- [ ] STRK-01: Streak chip shows real count, 3 states (continued/at-risk/inactive)
- [ ] STRK-02: Chip transitions at-risk → continued when session completes (280ms fill)
- [ ] STRK-03: Streak detail — period toggle (month/year/lifetime), default year
- [ ] STRK-04: GitHub-style activity heatmap (53w × 7d, 4-stop ramp)
- [ ] STRK-05: Rating distribution stacked bar chart
- [ ] STRK-06: Personal bests (longest streak, all-time reviews, days active)

**Add wizard polish**

- [ ] ADD-01: Live pipeline progress (lemma ✓, gender ✓, images 3/4…)
- [ ] ADD-02: Refresh image search with different query
- [ ] ADD-03: Sentence inline editing before save
- [ ] ADD-04: Source tagging (whatsapp, instagram, netflix, + custom)
- [ ] ADD-05: Clipboard auto-detect on sentence input
- [ ] ADD-06: Recent words on input screen

**SRS UX**

- [ ] SRS-01: Suspend / unsuspend cards
- [ ] SRS-02: Filter review session by tag, gender, or source
- [ ] SRS-03: Study ahead (review cards not yet due)
- [ ] SRS-04: 5-card sprint (streak rescue mode)
- [ ] SRS-05: New cards per day limit (settings)
- [ ] SRS-06: Individual card stats (review history, stability, difficulty)

**Cards library**

- [ ] LIB-01: Filter by gender, register, source tag, SRS state
- [ ] LIB-02: Edit card fields inline
- [ ] LIB-03: Delete card with confirmation

**Design**

- [ ] DSGN-01: OLED theme for night reviews (auto-triggered, not user-toggled)
- [ ] DSGN-02: v5 text rules — surface-driven, cobalt only for numbers + key actions

**Auth & sync**

- [ ] AUTH-01: Sign up / log in (Supabase Auth)
- [ ] AUTH-02: Cards and review history sync across devices
- [ ] AUTH-03: Audio files stored in Supabase Storage (not local path)

**Import / export**

- [ ] IMEX-01: Import words from CSV (own format, AI-processes each row)
- [ ] IMEX-02: Export cards to CSV
- [ ] IMEX-03: Import from Anki export (.csv or .txt deck export)

### Out of Scope

- Multi-user / social features — personal tool
- Android — iOS first
- Other languages — Portuguese only for now
- Web app — mobile only

## Context

- Monorepo: `apps/mobile` (Expo SDK 54, Expo Router v6, NativeWind v4), `apps/api` (Hono, port 3000), `packages/db` (Drizzle + Supabase Postgres)
- LLM: OpenRouter + Gemini 2.5 Flash Lite via `/messages`
- TTS: Narakeet; input is always the card's example sentence (no word-only audio)
- Images: Unsplash/Pexels search
- FSRS: implemented in API, scheduling working
- Design: v5 wireframes (calmer streak) are the current design target

## Constraints

- **iOS only**: React Native / Expo, no web
- **Personal scale**: no multi-tenancy concerns until auth phase
- **Audio local**: MP3s stored as local file paths until Phase 7 (Supabase Storage)
- **No Anki algorithm**: using FSRS, not SM-2. Anki import maps to FSRS initial state.

## Key Decisions

| Decision                                | Rationale                                                                                                                                   | Outcome                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| FSRS over SM-2                          | Better retention math, open source                                                                                                          | ✓ Shipped                 |
| Audio-first review front                | Ear-training focus; audio is the full sentence. Test = recall the i+1 unknown (word/grammar/concept) from context, not isolated word recall | — Pending implementation  |
| Color surface only at emotional peaks   | Fatigue risk in 15-min sessions                                                                                                             | — Pending design fidelity |
| Anki-compatible import (not full .apkg) | .apkg is SQLite + media, too complex; CSV export from Anki is sufficient                                                                    | — Pending                 |
| Auth deferred to Phase 7                | Single user, localhost-first for v0                                                                                                         | ✓ Accepted                |

---

_Last updated: 2026-06-20 after Phase 1 (Core Flow Fixed)_
