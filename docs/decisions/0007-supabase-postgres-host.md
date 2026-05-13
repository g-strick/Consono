# 0007. Supabase as Postgres host, audio storage, and future auth

- Status: accepted
- Date: 2026-05-13

## Context

V0 needs a managed Postgres host. The schema is six tables, the data
volume is single-user personal-driver scale, and budget is side-project
constrained. ADR 0002 forbids copyleft and prefers swappable
proprietary services. ADR 0003 establishes cloud-as-source-of-truth
with audio assets stored remotely.

Three categories of need surface across V0 → V1:

1. **V0:** Managed Postgres.
2. **V0:** Audio storage (S3-compatible bucket for Narakeet outputs).
3. **V1:** Auth (V0 has hardcoded user; public release requires real
   auth).

Picking three separate services (Neon + R2 + Clerk) is viable but
incurs three integrations and three billing relationships. Picking
one platform that covers all three reduces rework as the app
progresses through versions.

Self-hosting on a home server (Dell micro PC) was considered and
rejected: home internet reliability and tunneling overhead conflict
with the daily-driver requirement.

## Decision

Use **Supabase** as the V0+ platform for:

- **Postgres** (V0) — accessed via Drizzle ORM over standard `pg`
  driver, TCP connection. Not via Supabase JS client for DB access.
- **Storage** (V0) — audio clips stored in a Supabase Storage bucket.
  `audio_clips.storage_url` points to the bucket object.
- **Auth** (V1) — when auth lands at V1, use Supabase Auth via the
  Supabase JS client.

Free tier covers V0 indefinitely (500 MB DB, 1 GB storage, 5 GB
egress/mo — orders of magnitude above personal-driver volume). Pro
tier ($25/mo) reconsidered at V2 when public users land.

### Lock-in avoidance constraints

These are non-negotiable; violation requires a new ADR:

1. **DB access via Drizzle + standard `pg` driver**, not the Supabase
   JS client. Migration to any other Postgres host = `pg_dump |
pg_restore`.
2. **No Supabase-only Postgres extensions** at V0. Standard extensions
   (pgvector, pg_trgm, etc.) acceptable when widely supported.
3. **Authorization logic in app code**, not RLS-only. RLS may be added
   as defense-in-depth later but app code is the primary authz layer.
   Preserves portability to non-Supabase auth (Clerk, Lucia, Auth.js).
4. **`audio_clips.provider` field already exists** in the schema (per
   v0.md) and continues to identify the storage provider so audio
   storage can migrate without schema change.
5. **No Supabase Edge Functions at V0.** If serverless functions are
   needed later, that's a separate ADR.

## Alternatives Considered

- **Neon (managed Postgres, scales to zero).** Excellent V0 fit, low
  cost, standard `pg` driver. Rejected because V1 auth + V0 audio
  storage would need separate vendors (Clerk + R2 or similar),
  adding integration work the user wants to avoid.
- **Railway / Render Postgres.** Recognized, simple. Doesn't cover
  storage or auth — same vendor-stacking problem as Neon.
- **AWS RDS + S3 + Cognito.** Enterprise-standard, expensive, ops
  overhead disproportionate to V0. Rejected.
- **Self-hosted Postgres on Dell micro PC.** Zero incremental cost
  if hardware owned. Home internet and tunneling overhead conflict
  with daily-driver requirement; ops burden distracts from app
  building. Rejected for prod. Acceptable for local dev DB.
- **Supabase JS client as primary DB layer.** Faster initial setup
  but couples app code to Supabase. Rejected — keeps Drizzle as the
  abstraction.

## Consequences

### Positive

- Single platform covers V0 DB + V0 storage + V1 auth → less rework
  across version transitions
- Supabase is OSS and fully self-hostable → ultimate escape hatch
  exists if needed
- Free tier covers V0 indefinitely; no infra cost during personal-
  driver phase
- Drizzle + standard `pg` driver = migration to Neon / Railway /
  RDS / self-host is `pg_dump`-level work, not a rewrite

### Negative

- Supabase free-tier projects pause after 7 days of inactivity. Daily-
  driver use prevents this; if user skips a week, manual unpause via
  dashboard (~1 min). Not fatal.
- Two free projects max per account — enough for V0 prod + staging
  but constraints future experiments
- Doesn't scale to zero like Neon; less efficient for sporadic use
  (irrelevant at daily-driver cadence)
- Some Supabase ergonomics (RLS, JS client) intentionally not used,
  which is a small "paying full price, using 80%" inefficiency

### Neutral

- Migration path: if Supabase pricing or product direction sours,
  swap is mechanical because of the constraints above. Estimated
  cost: 1–2 days at V1 scale, more at V2+.
- Postgres extensions: pgvector available natively on Supabase if
  needed later (e.g., for semantic card search). Widely supported
  elsewhere, no lock-in.

## References

- ADR 0002 (no copyleft; proprietary acceptable if swappable)
- ADR 0003 (cloud-first sync, audio caching)
- ADR 0005 (provider boundary architecture)
- `docs/specs/v0.md` schema — `audio_clips.provider` field
- Supabase free-tier limits: https://supabase.com/pricing
