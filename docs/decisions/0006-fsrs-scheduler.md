# 0006. Use FSRS as the SRS scheduler

- Status: accepted
- Date: 2026-05-07

## Context

The SRS algorithm is the core of the review loop. SM-2 (classic Anki)
is predictable but inefficient. SM-15/17 (SuperMemo modern) more
accurate but proprietary. FSRS (Free Spaced Repetition Scheduler) is
MIT-licensed, based on three-component memory model (stability,
difficulty, retrievability), tuned per-user. Adopted by modern Anki.

Custom scheduler is not on the table.

## Decision

Use FSRS via `ts-fsrs` (MIT). State per-card in `cards` table at V0
(stability, difficulty, state, due, reps, lapses). Review log in
`reviews` table for analytics and parameter optimization.

Standard four-rating UI: again / hard / good / easy.

Per-user parameter optimization deferred to V2+ when sufficient review
data exists.

## Alternatives Considered

- **SM-2.** Lower-quality, well-known. FSRS strictly better, equally
  easy to integrate. Rejected.
- **Custom scheduler.** Solved problem. Rejected.
- **No SRS initially.** Defeats product premise. Rejected.

## Consequences

### Positive

- State-of-the-art scheduling from V0
- Open-source, permissively licensed
- Compatible with modern Anki — easier interop for V1 export
- Per-user parameter tuning available V2+

### Negative

- Slightly more complex card state than SM-2
- Less battle-tested than SM-2 in the wild — risk low

### Neutral

- Review log retention forever — small cost, worth it for parameter
  optimization

## References

- <https://github.com/open-spaced-repetition/fsrs>
