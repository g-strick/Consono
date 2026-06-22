# Phase 2: Review Loop + Home States - Context

**Gathered:** 2026-06-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire **real data and behavior** into the Review loop and Home screen that Phase 1.1 already reskinned to v6. The v6 layouts and palette are **locked** — this phase makes them functional, it does not re-layout.

In scope:

- Real **streak** computation (count + 3-state chip + the at-risk→continued tick) — STRK-01, STRK-02
- The four **Home** states driven by actual deck/time/session data — HOME-01..04
- Real **"today" session stats** that survive app restart, surfaced on Home all-done and the session-done screen — RVEW-04, HOME-03
- Real **"next batch" time** computed from the next due card — HOME-03
- **Slow-audio toggle** on the review front (revised RVEW-05 — see D-09)
- Review front/reveal/intro/done layouts (RVEW-01..03) are already built; only their data wiring (streak, speed) is touched

Out of scope (stays in later phases):

- Streak **detail** screen (period toggle, heatmap, distribution, bests) — STRK-03..06, **already built in 01.1-06**, owned by Phase 3
- Card editing / delete / library filters — LIB-01..03, Phase 5
- Settings screen, new-cards/day limit — SRS-05, Phase 5
- Study-ahead / filtered sessions / sprint — SRS-02..04, Phase 5
  </domain>

<decisions>
## Implementation Decisions

### Streak rules (STRK-01, STRK-02, HOME-04)

- **D-01:** A day keeps the streak alive if the user reviews **≥1 card** that day (any review counts — not "clear the full queue"). Forgiving model.
- **D-02:** Day boundary = **device local midnight**.
- **D-03:** Chip is **at-risk whenever the streak is alive but today has 0 reviews and there are cards available** — no 6pm time gate. (Overrides HOME-04's "after 6pm" wording.) Chip states: `continued` = ≥1 review today; `at-risk` = streak carried from yesterday, nothing reviewed today yet; `inactive` = no active streak (count ≤ 1 / broken).
- **D-04:** STRK-02 transition: the `StreakChip` 280ms fill animation already exists — wire it to fire on session-done by passing real `at-risk` (intro) → `continued` (done) with the real count. The done screen currently shows `count+1` as a literal; replace with the real post-session count.

### Home state logic (HOME-01..03)

- **D-05:** **First-run** (HOME-01, empty-deck prompt) is detected by **total card count == 0**, not by `dueCount === 0 && !data` (current unreachable branch). Needs a deck-total signal from the API.
- **D-06:** State precedence: `first-run` (0 cards total) → `daily-pickup` (due > 0) → `all-done` (cards exist, due == 0).
- **D-07:** Streak-at-risk is surfaced via the **chip state** (D-03), not as a separate full-screen Home body. No new screen.
- **D-08:** "Recently added" on Home must show the **most-recently-created cards** (currently it incorrectly shows due cards). Needs a recent-cards sort/signal from the API.

### Audio speed (revised RVEW-05)

- **D-09:** **Duolingo-style slow toggle, not a 3-way speed picker.** Audio always plays at full speed by default. Add a single **"slow" (turtle) control** to replay the current audio at reduced speed (~0.7×). No 1.0×/1.2× options. Replaces the static `0.7× · 1.0× · 1.2×` label on the front.
- **D-10:** Default behavior is **per-replay** (tap slow → hear it slow once), like Duolingo — not a sticky session/global preference. `users.audio_speed` is **not** the mechanism here (leave it untouched; it can serve a future global setting in Phase 5). Slow control applies on the **front**; available on the reveal sentence play too if cheap, but front is the priority.

### Today stats + next batch (RVEW-04, HOME-03)

- **D-11:** "Today's session" stats (reviewed count, accuracy) are aggregated from the **`reviews` table where `reviewed_at` is today (local)** — so they persist across app restart, not just in-session memory. Accuracy = `(reviewed − again) / reviewed`, consistent with the existing in-session math in `review/index.tsx`.
- **D-12:** **"Next batch" time** on the all-done state is computed from the **earliest `due_at` among the user's cards** (real countdown), replacing the hardcoded `next batch · 4h`.
- **D-13:** Estimated session time keeps the simple `cards × 0.3 min` heuristic for now (not history-derived) — good enough; revisit only if it feels wrong in UAT.

### Claude's Discretion

- API shape for the new aggregations (streak, deck-total + recent cards, today-stats, next-batch). Likely a small `/home/summary`-style endpoint plus a streak computation — researcher/planner to decide whether to add one endpoint or extend existing ones. The `reviews` and `cards` tables already hold everything needed; no schema change expected.
- Exact slow-playback rate (0.6–0.75×) and the turtle control's icon/placement, within the v6 front layout.
  </decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design source

- `wireframes/Wireframes v6.html` — the locked v6 layouts for Review (§R intro/front/reveal/done) and Home (3 states, streak chip). Phase 2 must match these; it only wires data.

### Requirements & roadmap

- `.planning/REQUIREMENTS.md` — RVEW-01..05, HOME-01..05, STRK-01..02 (Phase 2 rows); note STRK-03..06 are Phase 3.
- `.planning/ROADMAP.md` §"Phase 2" + the Phase 1.1 "Overlap note" (lines ~53) — phases 2–5 are re-scoped to functional depth on top of v6 surfaces.

### Prior phase (what's already built)

- `.planning/phases/01.1-v6-visual-redesign/01.1-04-SUMMARY.md` — review loop reskin; streak count is a placeholder, speed hint is static, waveform now View-based (not SVG).
- `.planning/phases/01.1-v6-visual-redesign/01.1-05-SUMMARY.md` — home reskin; streak placeholder, 3 states.

No external ADRs referenced during discussion.
</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `apps/mobile/src/components/StreakChip.tsx` — 3 states + 280ms fill already implemented; just needs real `count`/`state` props (D-04).
- `apps/mobile/app/review/index.tsx` — full v6 review flow; session stats (reviewed/accuracy/time) already computed in-session. Placeholders: `STREAK_PLACEHOLDER = 12`, the `0.7× · 1.0× · 1.2×` label, `count+1` on done.
- `apps/mobile/app/(tabs)/index.tsx` — Home with `getStreakState()`, `DueTile`, `RecentlyAdded`, `AllDoneState`. Placeholders: `streakCount = 1`, unreachable first-run branch, `next batch · 4h`, `today` stats `—`, recent = due cards.
- `apps/mobile/src/lib/api.ts` — `api` client; `getMe()` already returns `audio_speed`; `getDueCards()`, `submitReview()`. Add new calls here.
- `apps/api/src/routes/reviews.ts` — review POST already writes the immutable `reviews` log (rating, reviewed_at, duration_ms) — the data source for streak + today-stats.
- `packages/db/src/schema.ts` — `reviews` (reviewed_at, rating, state_before/after), `cards` (due_at, created_at, state), `users.audio_speed`. **No schema change expected.**

### Established Patterns

- API: Hono routes under `apps/api/src/routes/`, Zod-validated, Drizzle queries.
- Mobile: TanStack Query keyed lists (`['cards','due']`, `['users','me']`); add streak/home-summary query keys.
- Type primitives with explicit `surface` prop; cobalt reserved for numbers + key actions (DSGN-02).

### Integration Points

- New aggregation endpoint(s) → `apps/api/src/routes/` + mounted in the API entry.
- `api.ts` new client methods → consumed by Home (`(tabs)/index.tsx`) and Review intro/done.
- Streak value flows into both `StreakChip` on Home and the review intro/done chips.
  </code_context>

<specifics>
## Specific Ideas

- Slow-audio control should feel like **Duolingo's turtle button**: default audio is full speed, a separate control replays it slower. No speed-up option.
  </specifics>

<deferred>
## Deferred Ideas

- **Local card CRUD (edit/delete) + a basic settings screen** — raised during discussion. Maps to LIB-02/LIB-03 and SRS-05; stays in **Phase 5**. User confirmed "keep Phase 2 as is."
- **Global audio-speed preference** (persisted via `users.audio_speed`) — Phase 2 only does per-replay slow; a sticky global setting belongs with the Phase 5 settings screen.
- **History-derived session time estimate** — keep the simple heuristic for now (D-13).

</deferred>

---

_Phase: 2-review-loop-home-states_
_Context gathered: 2026-06-22_
