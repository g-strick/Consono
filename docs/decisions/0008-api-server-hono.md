# 0008. API Server: Hono on Node.js

- Status: accepted
- Date: 2026-05-14

## Context

V0 needs an HTTP API layer so the Expo app can trigger card generation
and submit review ratings. The server wraps the existing LLM, TTS, and
image-search providers and persists to the Supabase Postgres DB.

Requirements:

- TypeScript-native with good type inference
- Minimal boilerplate for a small number of routes (4 at V0)
- Works on Node.js today; portable to edge runtimes later without rewrite
- No framework lock-in to a specific deployment platform

## Decision

Use **Hono** with `@hono/node-server` as the HTTP framework.

Server lives in `apps/api/` as a new workspace package
(`@portuguese-app/api`). Routes are thin: validate input with Zod,
call providers, persist to DB, return JSON.

## Alternatives Considered

- **Express**: Mature, ubiquitous. No TypeScript-first design; requires
  extra packages for validation. Heavier than needed for 4 routes.
- **tRPC**: Excellent type safety end-to-end. Requires tRPC client on
  the Expo side; adds coupling before the mobile app is started.
  Revisit at V1 when the client/server contract stabilises.
- **Next.js API routes**: Brings the full Next.js framework for what is
  just a JSON API. Overkill; ties deployment to Vercel ergonomics.
- **Fastify**: Good option, but Hono is lighter and runtime-portable.

## Consequences

- Route handlers are plain async functions — easy to test and migrate
- Hono's `fetch`-based handler works on Cloudflare Workers, Deno, Bun,
  and Node.js — deployment platform stays open
- `@hono/zod-validator` provides request validation at the route level
  matching the Zod-first pattern already used across the codebase
- If tRPC adoption is warranted at V1, routes can be wrapped without
  changing the underlying logic

## References

- ADR 0003 (cloud-first sync — this server is the cloud layer)
- ADR 0005 (provider boundaries — routes call providers, not raw APIs)
- ADR 0007 (Supabase Postgres — db package used here)
