# Phase 2: Review Loop + Home States - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-22
**Phase:** 2-review-loop-home-states
**Areas discussed:** Streak rules, At-risk/rollover, Next batch, Audio speed

---

## Scope check (pre-discussion)

User initially asked to pivot Phase 2 to "edit cards locally + basic settings." Clarified those map to LIB-02/03 and SRS-05 (Phase 5), offered re-scope / insert-phase / keep-as-is. **User chose: "keep Phase 2 as is."** Card editing + settings deferred to Phase 5.

---

## Streak rules — what counts as a day

| Option               | Description                                  | Selected |
| -------------------- | -------------------------------------------- | -------- |
| Clear full due queue | Day counts only when all due cards finished  |          |
| Any review           | Day counts if ≥1 card reviewed, even partial | ✓        |

**User's choice:** Any review.
**Notes:** Forgiving model — partial sessions keep the streak.

---

## At-risk / rollover

| Option                | Description                                                    | Selected |
| --------------------- | -------------------------------------------------------------- | -------- |
| 6pm + local midnight  | At-risk after 18:00 if queue not cleared; day = local midnight |          |
| Always at-risk if due | Chip at-risk any time today isn't satisfied, no hour gate      | ✓        |

**User's choice:** Always at-risk if due.
**Notes:** Overrides HOME-04's "after 6pm" wording. With "any review counts," chip is `continued` once any review happens today.

---

## Next batch time

| Option               | Description                            | Selected |
| -------------------- | -------------------------------------- | -------- |
| From earliest due_at | Real countdown to next card coming due | ✓        |
| Keep fixed label     | Static "next batch · 4h"               |          |

**User's choice:** From earliest due_at.

---

## Audio speed toggle

| Option                         | Description                                  | Selected |
| ------------------------------ | -------------------------------------------- | -------- |
| Persist globally, both screens | Save to user.audio_speed, apply front+reveal |          |
| Per-session only               | Ephemeral within session                     |          |

**User's choice:** Free text — "only a slow down audio button. no need to increase speed. audio always plays full speed originally, but an additional option to switch to slow. similar to how Duolingo does it."
**Notes:** Revises RVEW-05 from a 0.7/1.0/1.2 three-way to a single Duolingo-style slow (turtle) replay. Default full speed; per-replay slow (~0.7×). `users.audio_speed` left untouched for a future global setting.

---

## Claude's Discretion

- API shape for new aggregations (streak, deck-total + recent cards, today-stats, next-batch) — one endpoint vs extending existing. No schema change expected.
- Exact slow rate (0.6–0.75×) and turtle control placement/icon.
- Home first-run detection via total-card-count signal; session-time estimate keeps `cards × 0.3` heuristic.

## Deferred Ideas

- Local card CRUD (edit/delete) + basic settings screen → Phase 5 (LIB-02/03, SRS-05).
- Global persisted audio-speed preference → Phase 5 settings.
- History-derived session-time estimate → later.
