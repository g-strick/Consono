# Phase 3: Streak Detail + Design Fidelity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 3-streak-detail-design-fidelity
**Areas discussed:** Audit scope & risk, Personal bests, Period windows, Retention metric

---

## Audit scope & risk (DSGN-02)

| Option                               | Description                                                                | Selected |
| ------------------------------------ | -------------------------------------------------------------------------- | -------- |
| Fix app-wide, verify changed screens | Audit everywhere, fix all violations, spot-check touched screens on-device |          |
| Streak screen only + document        | Fix new screen; catalog the rest into a deferred checklist                 |          |
| Fix everything, no re-check          | Apply all fixes app-wide, trust the audit, no on-device re-verification    | ✓        |

**User's choice:** Fix everything, no re-check.
**Notes:** Claude added two sensible defaults consistent with the choice — violation definition =
the 03-UI-SPEC DSGN-02 Audit Checklist, and the audit emits a `file:line` changelog as the
traceability artifact (cheap insurance given re-UAT is skipped).

---

## Personal bests (STRK-06)

| Option                      | Description                                                               | Selected |
| --------------------------- | ------------------------------------------------------------------------- | -------- |
| Top 5, current always shown | Top 5 longest runs; ongoing streak always shown (badged), ties by recency | ✓        |
| Top 3, current always shown | Same logic, tighter 3-row list                                            |          |
| Top 5, strictly by length   | Pure longest-5; current shows only if genuinely top 5                     |          |

**User's choice:** Top 5, current always shown.
**Notes:** Run = maximal consecutive-active-day stretch (≥1 review/day, same active-day def as
computeStreak). Runs of any length qualify; new user falls back to the single current-row entry per
UI-SPEC empty state. Not period-scoped — always all-time.

---

## Period windows (STRK-03/04/05)

| Option                  | Description                                                                                                       | Selected |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| Match the heatmap above | Each period's stats span exactly its heatmap window (month=calendar month, year=trailing 53wk, lifetime=all-time) | ✓        |
| All rolling windows     | Month=past 30d, Year=past 365d, Lifetime=all-time                                                                 |          |
| All calendar periods    | Month=this calendar month, Year=this calendar year, Lifetime=all-time                                             |          |

**User's choice:** Match the heatmap above.
**Notes:** Resolves the UI-SPEC rolling-vs-calendar conflict. Triggers one copy deviation (D-08):
month stat subs "past 30 days" → "this month"; year/lifetime copy unchanged.

---

## Retention metric (STRK-03)

| Option                      | Description                                                                                                                     | Selected |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| True FSRS retention         | Anki "True Retention": denominator = state_before='review' due tests; recalled = rating≠again; excludes new/learning/relearning | ✓        |
| Reused accuracy             | (reviewed − again)/reviewed over all reps — identical to Home/session accuracy                                                  |          |
| True retention + relearning | Like True FSRS retention but also counts relearning reps as due-recall tests                                                    |          |

**User's choice:** True FSRS retention.
**Notes:** Initially unselected; user opted to discuss it rather than accept the reused-accuracy
default. Schema (`reviews.state_before`, `rating`) fully supports it. Intentionally diverges from the
Home/session "accuracy" number — different metrics, both correct.

---

## Claude's Discretion

- Heatmap intensity thresholds — GitHub-style quartile-based mapping (STRK-04 "GitHub-style").
- API delivery shape — new `/streak/stats` endpoint vs extend `/home/summary`; pre-load all periods
  (preferred for instant toggle) vs fetch-on-toggle. No schema change expected.
- Aggregation logic location — pure unit-tested lib (`streakStats.ts`) mirroring `homeSummary.ts`.
- "Longest streak" per-period scoping rule (within vs ends-within the window).

## Deferred Ideas

- Share action on streak nav (present, no-op).
- Heatmap cell tap / day-detail interaction.
- Manual OLED override / user toggle (DSGN-01 stays auto-only).
- Global audio-speed preference, card CRUD, settings screen — Phase 5.
  </content>
