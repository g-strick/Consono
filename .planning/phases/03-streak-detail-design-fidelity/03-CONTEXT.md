# Phase 3: Streak Detail + Design Fidelity - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the streak detail screen **real**, and apply the **v5 text rules across the app**.

The v6 streak detail shell was shipped in Phase 1.1 — its layout, palette, components, and the
working period toggle are all locked. **Every number on it today is static placeholder data**
(`HERO`, `STATS`, `RATING`, `YEAR_LEVELS`, `MONTH_DAYS`, `BESTS` in `app/streak/index.tsx`).

In scope:

- Real aggregation for the streak detail screen, scoped by **month / year / lifetime** —
  hero stats, 2×2 stat grid (longest, retention, reviews, days active), activity heatmaps,
  reviews bar chart, rating distribution, personal bests — STRK-03, STRK-04, STRK-05, STRK-06
- **App-wide DSGN-02 text-rule audit** — surface-driven text colors everywhere; cobalt only on
  numbers / key actions / active states
- DSGN-01 OLED night trigger is **already built** in Phase 1.1 (`useNightSurface`); this phase
  only audits/verifies it, no new work expected

Out of scope (stays in later phases):

- New visual surfaces, re-layout, or palette changes — the UI-SPEC locks all of it
- Share action on the streak nav (present, no-op — deferred)
- Card CRUD, settings, global audio-speed preference — Phase 5
- Auth — Phase 6

**The 03-UI-SPEC.md design contract is authoritative for all visual/layout/copy decisions** and is
not re-litigated here (one copy deviation, D-08, is the only override). This CONTEXT covers the
**data-semantics** decisions the UI-SPEC leaves open.

</domain>

<decisions>
## Implementation Decisions

### DSGN-02 — app-wide text-rule audit

- **D-01:** Audit scope is **app-wide and fix-everything**. Find and fix **all** cobalt-on-light
  body-copy violations across every screen (home, review, add wizard, library, streak, etc.).
  **Trust the audit — NO re-UAT** of the already-approved Phase 1/2 screens. (User explicitly chose
  "fix everything, no re-check.")
- **D-02:** Violation definition = the **Audit Checklist + Surface Text Rule tables in
  `03-UI-SPEC.md`**. Cobalt (`#1F3494` / `colors.brand` / `colors.brandFill`) is permitted **only**
  on `Num`, `Action`, key-action `Body tone="brand"`, active toggle states, and the specific call
  sites enumerated in the UI-SPEC "Color" section. Any other body-copy use of cobalt on a light
  surface is a violation. Text follows surface, not brand.
- **D-03:** Because re-UAT is skipped, the audit **emits a written changelog** (every `file:line`
  changed, before→after) as the traceability artifact. Cheap insurance; lets the user spot-check
  later if anything looks off.

### Personal bests (STRK-06)

- **D-04:** A "best" = a **maximal consecutive-active-day run** derived from the reviews log. An
  active day = a day with **≥1 review** (same definition as `computeStreak` / Phase 2 D-01, device
  local midnight / D-02). Runs ranked **longest-first**.
- **D-05:** Show up to the **top 5** runs. The **ongoing/current streak always appears** (badged
  "current") even if it isn't in the top 5 — so the screen always reflects where the user is now.
  Equal-length ties broken by **most recent**.
- **D-06:** Runs of **any length (incl. 1-day)** qualify; ranking surfaces the best naturally. New
  user with few/no runs → render the **single current-row entry** ("0 days", "today") per the
  UI-SPEC empty state, so the card is never blank. **Not period-scoped — always all-time.**

### Period windows (STRK-03/04/05)

- **D-07:** **"Match the heatmap above."** Each period's stats _and_ charts span exactly the window
  its heatmap shows:
  - **Month** = current **calendar month** (1st → today). Days-active denominator = calendar days
    in the month ("of 30/31"). Heatmap = the month's calendar grid.
  - **Year** = **trailing 53 weeks (~365 days)** ending today. Heatmap = the 53w × 7d trailing grid.
  - **Lifetime** = all time (first review → today).
- **D-08:** **COPY DEVIATION from the 03-UI-SPEC Copywriting Contract** (the only override): the
  **month** stat sub-lines change from "past 30 days" → **"this month"** (retention sub and reviews
  sub) to match calendar-month windowing. Month days-active sub stays **"of {N}"** (N = days in the
  calendar month). **Year** ("past year") and **lifetime** ("all time") subs are unchanged — they
  already match D-07. Everything else in the copy contract stands.

### Retention metric (STRK-03)

- **D-09:** "retention %" = **True FSRS retention** (Anki "True Retention"). Over the period window:
  - Denominator = reviews where **`state_before == 'review'`** (genuinely-due recall tests).
  - Numerator = those with **`rating != 'again'`** (recalled).
  - **Excludes** new / learning / relearning reps.
  - `retention = recalled_due / total_due`; **0 due reviews in window → display 0%**.
  - This is **intentionally a different number** from the Home/session **"accuracy"** (which is
    `(reviewed − again)/reviewed` over _all_ reps, Phase 2 D-11). They measure different things and
    both are correct — do not "reconcile" them.

### Claude's Discretion

- **Heatmap intensity thresholds:** GitHub-style **quartile-based** mapping of per-day review counts
  → the 4-stop ramp (heat-0 = 0 activity, heat-1/2/3 by intensity). Planner/executor pick the exact
  bucketing (quartiles vs fixed count bins) — whatever reads cleanly. "Today" cell always **outlined,
  never filled** (per UI-SPEC).
- **API delivery shape:** Add a new aggregation endpoint (e.g. `GET /streak/stats`) vs extend
  `GET /home/summary`; return **all three periods in one payload** (enables the instant,
  no-animation period toggle the UI-SPEC mandates — **preferred**) vs fetch-on-toggle. Planner's
  call. **No schema change expected** — `reviews` + `cards` hold everything.
- **Aggregation logic location:** Mirror Phase 2 — a **pure, unit-tested lib** (e.g.
  `apps/api/src/lib/streakStats.ts` alongside `homeSummary.ts`) consumed by the route. Vitest tests
  like `homeSummary.test.ts`.
- **"Longest streak" stat tile per period:** the longest run within / ending within that period's
  window (consistent with D-07); use the run's real start–end dates for the year/lifetime sub-label
  (e.g. "jan 4 – jan 21", per UI-SPEC).

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract — read first (locked)

- `.planning/phases/03-streak-detail-design-fidelity/03-UI-SPEC.md` — **the single most important
  ref.** Locks all visual / layout / color / typography / spacing / copy for the streak screen, plus
  the DSGN-02 Surface Text Rule tables and the Audit Checklist. Note: **D-08 overrides only the month
  stat-sub copy**; everything else stands.
- `wireframes/Wireframes v6.html` — the v6 design source the UI-SPEC transcribes (heatmap density,
  reviews chart, period toggle specs).

### Requirements & roadmap

- `.planning/REQUIREMENTS.md` — STRK-03..06, DSGN-01..02.
- `.planning/ROADMAP.md` §"Phase 3" — goal, 5-plan outline, success criteria; + the Phase 1.1
  overlap note (DSGN delivered as v6 surfaces in 1.1; Phase 3 = functional depth).

### Prior phase — what's built / patterns to mirror

- `.planning/phases/02-review-loop-home-states/02-CONTEXT.md` — streak rules **D-01** (active-day
  def) / **D-02** (local-midnight boundary), accuracy formula **D-11**, aggregation-endpoint pattern.
- `apps/api/src/lib/homeSummary.ts` (+ `homeSummary.test.ts`) — `computeStreak` pure fn + date
  helpers (`dayKeyLocal`, `localDayStart`) and the vitest unit-test pattern to extend for
  longest-run / retention / days-active / per-day-count aggregation.
- `apps/api/src/routes/home.ts` — `GET /home/summary` aggregation route pattern.

### Data

- `packages/db/src/schema.ts` — `reviews` (reviewed_at, rating, state_before/after, scheduled_days),
  `cards` (state, due_at, created_at). `cardStateEnum = new/learning/review/relearning`;
  `ratingEnum = again/hard/good/easy`. Supports True FSRS retention (D-09). **No schema change
  expected.** `reviews` has no `user_id` → scope via `inArray(card_id, userCardIds)`.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `apps/mobile/app/streak/index.tsx` — full v6 layout shipped; **all data is static placeholder**
  (`HERO`, `STATS`, `RATING`, `YEAR_LEVELS` via `genLevel`, `MONTH_DAYS`, `BESTS`). Phase 3 replaces
  these with real query data; layout/components untouched.
- Components already built (just need real props): `StatTile`, `Heatmap` (YearHeatmap /
  MonthHeatmap), `RatingDistribution`, `Card`/`Surface`, `Type` primitives (Body/Mono/Num).
  ⚠ The UI-SPEC also names `ReviewsChart` and `LifetimeBars` — executor should **verify these exist**
  (not imported in the current `streak/index.tsx` head) and build if missing.
- `apps/api/src/lib/homeSummary.ts` — `computeStreak` + date helpers; extend with longest-run /
  retention / days-active / per-day-count aggregation.
- `apps/mobile/src/lib/api.ts` — `api` client; add a streak-stats method (mirror `getHomeSummary`).
- `apps/mobile/src/lib/theme.ts` (`colors`, `textColors`, `textForSurface`) + `Type.tsx`
  `useTextColor` — the surface-aware text system the DSGN-02 audit enforces.

### Established Patterns

- API: Hono routes, Zod-validated, Drizzle queries; **pure logic in `src/lib/*.ts` with vitest unit
  tests** (`homeSummary.test.ts`).
- Mobile: TanStack Query keyed lists; add a streak-stats query key.
- Surface-driven text: cobalt only on `Num` / `Action` / key actions / active states (DSGN-02).

### Integration Points

- New/extended aggregation endpoint → `apps/api/src/routes/` → consumed by the streak screen via
  `api.ts` + TanStack Query. Pre-load all three periods so the toggle is instant (UI-SPEC).
- DSGN-02 audit touches text-color call-sites across **all** mobile screens (home, review, add
  wizard, library, streak).

</code_context>

<specifics>
## Specific Ideas

- "retention" must mean what SRS users expect — **Anki "True Retention"**, not raw accuracy —
  explicitly chosen to **diverge** from the Home/session accuracy number.
- **"Match the heatmap above"** principle: every stat describes exactly the chart directly above it —
  no rolling-vs-calendar mismatch between a number and its visualization.

</specifics>

<deferred>
## Deferred Ideas

- **Share action** (↗ on streak nav) — present but no-op; explicitly out of STRK-03..06 scope.
- **Heatmap cell tap / day-detail interaction** — none defined; display-only this phase.
- **Manual OLED override / user toggle** — DSGN-01 is auto (system dark mode + time) only; manual
  control not in scope.
- **Global audio-speed preference, card CRUD, settings screen** — already deferred to Phase 5.

</deferred>

---

_Phase: 3-streak-detail-design-fidelity_
_Context gathered: 2026-06-24_
</content>
</invoke>
