# Phase 6: Auth & Cloud Sync — Research

**Researched:** 2026-06-29
**Domain:** Supabase Auth (email/password), JWT middleware in Hono, Supabase Storage (Node.js upload), Expo React Native session persistence
**Confidence:** HIGH (all architecture decisions pre-locked in ADR 0007; core library APIs verified)

---

## Summary

Phase 6 implements what ADR 0007 already prescribed: Supabase Auth for real email/password sign-up/login, Supabase Storage for audio files, and removal of the hardcoded `V0_USER_ID` sentinel across all API routes. The database host, storage provider, and auth provider are all already Supabase — this phase wires them up.

The critical design constraint is ADR 0007 rule 3: "Authorization logic in app code, not RLS-only. RLS may be added as defense-in-depth later but app code is the primary authz layer." This means authorization is enforced by the existing `WHERE user_id = $currentUser` Drizzle clauses; RLS is an optional defense layer, not the primary gate. The `postgres` role has `BYPASSRLS` in Supabase's default setup, so any RLS policies added are silently bypassed by the API. There is a tension here between Plan 2 of the roadmap ("Row-level security on all DB tables") and ADR 0007 rule 3 — this is surfaced as Open Question 4.

The primary work is: (1) add Supabase Auth JWT verification as Hono middleware (likely ES256/JWKS for a project created in 2026), replacing `V0_USER_ID` across five route files; (2) add a `supabase` singleton in the API using the service role key for Storage uploads only; (3) migrate audio from local disk to Supabase Storage (public bucket, content-addressed paths) — including changing how the cards routes construct audio URLs and how the mobile API client consumes them; (4) add the Supabase client to the mobile app with AsyncStorage/SecureStore persistence and auth screens.

**Primary recommendation:** Wire JWT auth via Hono's built-in `jwk` middleware (ES256, JWKS endpoint — primary path for 2026 projects) or `jwt` middleware (HS256 — legacy fallback, pre-Oct-2025 projects). Verify algorithm in Supabase dashboard before coding. Replace `V0_USER_ID` with `c.get('jwtPayload').sub`. Use `@supabase/supabase-js` on the API for Storage uploads only (service role). On mobile, use `@supabase/supabase-js` + `expo-secure-store` for session persistence with the `LargeSecureStore` pattern.

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                 | Research Support                                                                                                                                                                       |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | User can sign up and log in with email/password (Supabase Auth)             | Supabase Auth email/password flow; Expo client with SecureStore persistence                                                                                                            |
| AUTH-02 | Cards and review history sync across devices via Supabase                   | Already in Postgres; auth layer ensures per-user scoping replaces V0_USER_ID                                                                                                           |
| AUTH-03 | Audio files stored in Supabase Storage (removes local file path dependency) | Supabase Storage public bucket upload from Node.js; replace /audio/:hash route; change cards routes to JOIN audio_clips and emit storage_url; remove BASE prepend in mobile API client |

</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- Use `npm install` / `yarn install` for dependencies (project uses `pnpm`; always use pnpm for workspace packages)
- Follow TypeScript best practices; avoid `any`
- Use ESLint and Prettier if configured
- Run `npm test` to execute tests

**Additional project-level constraints from ADRs and architecture (non-negotiable):**

- DB access MUST remain via Drizzle + standard `pg` driver — never via Supabase JS client for queries (ADR 0007 rule 1)
- Authorization logic in app code (`WHERE user_id = $current`), not RLS-only (ADR 0007 rule 3)
- No Supabase Edge Functions (ADR 0007 rule 5)
- Provider boundaries: `AudioStorageProvider` is one of exactly four provider interfaces in ADR 0005, scoped to `apps/mobile/src/providers/`. However, audio synthesis and upload is server-side (API), not mobile. Placing the Storage upload module in `apps/api/src/lib/storage.ts` is a deviation from ADR 0005 — see ADR 0005 Deviation note below.
- No copyleft licenses (ADR 0002)
- Every external response validated through Zod before use
- No silent fallbacks — throw loudly on errors

**ADR 0005 Deviation — AudioStorageProvider:**
ADR 0005 names `AudioStorageProvider` as one of four interface boundaries, all in `apps/mobile/src/providers/`. But TTS synthesis happens server-side (the API imports `synthesize()` from `mobile/src/providers/tts.ts`), so the Storage upload naturally follows server-side. Placing it in `apps/api/src/lib/storage.ts` (not `apps/mobile/src/providers/`) is a practical deviation from ADR 0005. The planner must either (a) flag this for explicit user sign-off, or (b) create `apps/mobile/src/providers/audio-storage/` with a server-side implementation stub that the API can import — matching the ADR intent but adding a layer. Option (a) is recommended: note the deviation and proceed with `apps/api/src/lib/storage.ts`.

---

## Architectural Responsibility Map

| Capability                         | Primary Tier                     | Secondary Tier | Rationale                                                                                         |
| ---------------------------------- | -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Auth sign-up / sign-in UI          | Mobile (Expo)                    | —              | User-facing screens live in the mobile app                                                        |
| Session token storage              | Mobile (Expo)                    | —              | JWT stored encrypted on device via LargeSecureStore                                               |
| JWT verification / user extraction | API (Hono middleware)            | —              | Every API request is gate-kept here                                                               |
| User profile creation              | DB trigger (Postgres)            | —              | `on_auth_user_created` trigger auto-creates `users` row from `auth.users`                         |
| Per-user query scoping             | API (Drizzle WHERE clauses)      | —              | App code is primary authz per ADR 0007                                                            |
| Audio file upload                  | API (Node.js → Supabase Storage) | —              | TTS synthesis happens server-side; upload follows synthesis                                       |
| Audio file URL storage             | DB (`audio_clips.storage_url`)   | —              | Already a text column; switches from local path to https:// URL                                   |
| Audio URL construction for clients | API (cards routes)               | —              | Cards routes must JOIN audio_clips and emit storage_url directly (not build `/audio/:hash` paths) |
| Audio file serving                 | Supabase Storage CDN             | —              | Replaces `GET /audio/:hash` local file server; mobile requests CDN directly                       |
| RLS policies (defense-in-depth)    | DB (Postgres policies)           | —              | Optional per ADR 0007 rule 3; actively bypassed by postgres role — see Open Question 4            |

---

## Standard Stack

### Core (Mobile — auth)

| Library                                     | Version                          | Purpose                                                            | Why Standard                                                     |
| ------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `@supabase/supabase-js`                     | 2.108.2 [VERIFIED: npm registry] | Supabase Auth client on mobile (sign-up, sign-in, session refresh) | Official Supabase client; ADR 0007 explicitly allows it for auth |
| `expo-secure-store`                         | 56.0.4 [VERIFIED: npm registry]  | Encrypted key-value storage for the AES key portion of session     | Already installed in mobile package.json                         |
| `@react-native-async-storage/async-storage` | 3.1.1 [VERIFIED: npm registry]   | Stores the encrypted JWT payload (LargeSecureStore pattern)        | SecureStore has a 2048-byte limit; JWT sessions exceed this      |
| `react-native-url-polyfill`                 | 3.0.0 [VERIFIED: npm registry]   | URL global polyfill required by supabase-js in React Native        | Supabase official docs require it for RN                         |
| `aes-js`                                    | 3.1.2 [VERIFIED: npm registry]   | AES-256-CTR encryption for LargeSecureStore                        | Pure-JS, no native module, Supabase official example uses it     |
| `react-native-get-random-values`            | 2.0.0 [VERIFIED: npm registry]   | Crypto.getRandomValues() polyfill needed by aes-js key generation  | Required by LargeSecureStore pattern on RN                       |

### Core (API — auth middleware + storage)

| Library                          | Version                                           | Purpose                                                                              | Why Standard                                                          |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `hono` built-in `jwk` middleware | already in use (4.12.27) [VERIFIED: npm registry] | Verify ES256 Supabase JWT via JWKS endpoint (primary path for 2026 projects)         | Built into Hono; requires explicit `alg` allowlist; rejects HS256     |
| `hono` built-in `jwt` middleware | already in use (4.12.27) [VERIFIED: npm registry] | Verify HS256 Supabase JWT via shared secret (legacy fallback, pre-Oct-2025 projects) | Built into Hono; simpler than jwk but only for shared-secret projects |
| `@supabase/supabase-js`          | 2.108.2 [VERIFIED: npm registry]                  | Service-role client for Storage uploads only — NOT for DB queries                    | ADR 0007: auth via Supabase JS client is explicitly allowed at V1     |

> **JWT algorithm note:** Supabase projects created after Oct 2025 default to asymmetric ES256 keys. This project's ADRs are dated 2026-05 and 2026-06, making ES256 the likely algorithm. Verify in Supabase Dashboard → Settings → JWT before coding the middleware. Use `hono/jwk` for ES256 and `hono/jwt` for HS256. [CITED: supabase.com/docs/guides/auth/signing-keys, hono.dev/docs/middleware/builtin/jwk]

### Supporting

| Library                | Version              | Purpose                   | When to Use                                          |
| ---------------------- | -------------------- | ------------------------- | ---------------------------------------------------- |
| `@supabase/storage-js` | (inside supabase-js) | Standalone Storage client | Don't install separately; use via `supabase.storage` |

### Alternatives Considered

| Instead of                                        | Could Use                                         | Tradeoff                                                                                                                   |
| ------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `expo-secure-store` + `aes-js` (LargeSecureStore) | `@react-native-async-storage/async-storage` alone | AsyncStorage is plaintext; session tokens should be encrypted on device                                                    |
| Hono `jwk` middleware (ES256)                     | `hono/jwt` with shared secret                     | HS256 only valid if project predates Oct 2025; ES256 is more secure and more likely                                        |
| Public Supabase Storage bucket                    | Private bucket with signed URLs                   | Signed URLs expire and require server round-trip; audio is content-addressed and non-secret — public bucket is appropriate |

**Installation (mobile):**

```bash
pnpm --filter @portuguese-app/mobile add @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill aes-js react-native-get-random-values
# expo-secure-store is already installed per package.json
```

**Installation (api):**

```bash
pnpm --filter @portuguese-app/api add @supabase/supabase-js
```

---

## Package Legitimacy Audit

| Package                                     | Registry | slopcheck | Disposition                                        |
| ------------------------------------------- | -------- | --------- | -------------------------------------------------- |
| `@supabase/supabase-js`                     | npm      | [OK]      | Approved                                           |
| `@react-native-async-storage/async-storage` | npm      | [OK]      | Approved                                           |
| `react-native-url-polyfill`                 | npm      | [OK]      | Approved                                           |
| `expo-secure-store`                         | npm      | [OK]      | Approved                                           |
| `aes-js`                                    | npm      | [OK]      | Approved                                           |
| `react-native-get-random-values`            | npm      | [OK]      | Approved                                           |
| `@supabase/storage-js`                      | npm      | [OK]      | Approved — install via supabase-js, not standalone |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none
**Postinstall scripts:** All packages verified — none have `postinstall` scripts that reference network calls or filesystem paths outside the project. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
Mobile App (Expo)
  │
  │  [Auth flows]  supabase.auth.signUp() / signInWithPassword()
  │  ─────────────────────────────────────────────────────────▶ Supabase Auth (auth.users)
  │                                                                 │
  │                                                          on_auth_user_created trigger
  │                                                                 │
  │                                                          public.users row inserted
  │
  │  [All API calls]  Authorization: Bearer <JWT>
  │  ─────────────────────────────────────────────────────────▶ Hono API Server
  │                                                                 │
  │                                                         jwk/jwt middleware
  │                                                         (verify sig → extract sub)
  │                                                                 │
  │                                                         Route handlers
  │                                                         (WHERE user_id = sub)
  │                                                         + audio_url = storage_url from audio_clips
  │                                                                 │
  │                                                         Drizzle + pg driver
  │                                                                 │
  │                                                         Supabase Postgres
  │
  │  [Audio playback]  audio_url already a full https:// URL from API response
  │  ─────────────────────────────────────────────────────────▶ Supabase Storage CDN (public)

API Server (during card creation / sentence edit):
  synthesize(text) → MP3 buffer
  uploadAudio(hash, buffer) → https://<ref>.supabase.co/storage/v1/object/public/audio/<hash>.mp3
  INSERT INTO audio_clips (storage_url = <public https:// URL>)
  GET /cards response: audio_url = storage_url (no path construction)
```

### Recommended Project Structure Changes

```
apps/api/src/
├── lib/
│   ├── auth.ts          # NEW: Hono JWT/JWK middleware (verifyToken, getUserId)
│   ├── storage.ts       # NEW: Supabase Storage client (service role) + uploadAudio()
│   ├── constants.ts     # REMOVE V0_USER_ID after migration
│   └── ...existing...
├── routes/
│   └── audio.ts         # REMOVE after migration verified
apps/mobile/src/
├── lib/
│   ├── supabase.ts      # NEW: createClient with LargeSecureStore adapter
│   └── api.ts           # MODIFY: attach Bearer token; remove BASE prepend for audio URLs
├── providers/
│   └── (audio-storage/) # OPTIONAL: if ADR 0005 deviation is not accepted, interface goes here
app/
├── (auth)/              # NEW: Expo Router auth group
│   ├── _layout.tsx
│   ├── sign-in.tsx
│   └── sign-up.tsx
└── _layout.tsx          # MODIFY: add auth redirect logic + AppState listener
```

### Pattern 1: Hono JWT/JWK Middleware (verify which applies first)

**What:** A middleware registered on the Hono app that verifies the Supabase JWT and stores the payload in context.
**When to use:** Globally — wrap all routes that require authentication.

**Confirmed Hono middleware API:** [CITED: hono.dev/docs/middleware/builtin/jwk]

- `hono/jwk` — for asymmetric keys (ES256, RS256, etc.); requires `jwks_uri` or inline `keys`; requires explicit `alg` allowlist; rejects symmetric (HS\*) algorithms
- `hono/jwt` — for symmetric keys (HS256); requires `secret`

```typescript
// apps/api/src/lib/auth.ts
// Source: hono.dev/docs/middleware/builtin/jwk and hono.dev/docs/middleware/builtin/jwt [CITED]
// Source: supabase.com/docs/guides/auth/signing-keys [CITED]

// === PRIMARY PATH: ES256/JWKS (new Supabase projects, created after Oct 2025) ===
// This project's ADRs are dated 2026-05 and 2026-06 — ES256 is the likely algorithm.
// Verify in Supabase Dashboard → Settings → JWT before coding.
import { jwk } from 'hono/jwk';
import type { MiddlewareHandler } from 'hono';

export const authMiddleware: MiddlewareHandler = jwk({
  jwks_uri: `${process.env['SUPABASE_URL']}/auth/v1/.well-known/jwks.json`,
  alg: ['ES256'], // required allowlist; middleware rejects anything not listed
});

// === LEGACY FALLBACK: HS256 (Supabase projects created before Oct 2025) ===
// import { jwt } from 'hono/jwt';
// export const authMiddleware: MiddlewareHandler = jwt({
//   secret: process.env['SUPABASE_JWT_SECRET']!,
//   alg: 'HS256',
// });

// Helper: extract userId from verified payload
export function getUserId(c: import('hono').Context): string {
  const payload = c.get('jwtPayload') as { sub: string };
  if (!payload?.sub) throw new Error('Missing sub claim in JWT');
  return payload.sub;
}
```

```typescript
// apps/api/src/index.ts — apply middleware globally
import { authMiddleware } from './lib/auth.js';

// Health check before auth guard (no auth required)
app.get('/health', (c) => c.json({ ok: true }));
// Apply to all other routes
app.use('/*', authMiddleware);
```

### Pattern 2: Replace V0_USER_ID in Route Handlers

**What:** Swap every `V0_USER_ID` constant reference with the JWT-derived `sub` claim.
**When to use:** All five affected route files after the middleware is in place.

```typescript
// BEFORE (e.g. apps/api/src/routes/cards.ts)
import { V0_USER_ID } from '../lib/constants.js';
// ...
eq(table.user_id, V0_USER_ID);

// AFTER
import { getUserId } from '../lib/auth.js';
// ...
const userId = getUserId(c);
eq(table.user_id, userId);
```

Affected files:

- `apps/api/src/routes/cards.ts` — 6 occurrences of V0_USER_ID
- `apps/api/src/routes/generate.ts` — 2 occurrences
- `apps/api/src/routes/users.ts` — 1 occurrence
- `apps/api/src/routes/home.ts` — 1 occurrence
- `apps/api/src/routes/streak.ts` — 1 occurrence

**Note on `reviews.ts`:** Currently does not reference V0_USER_ID — it looks up `cards.id` directly. Security concern: `POST /reviews` accepts any `card_id` without verifying the card belongs to the current user. Phase 6 must add a user ownership check here: find card WHERE id = card_id AND user_id = userId; return 403 if not found.

### Pattern 3: Audio URL Read-Path Change (cards routes)

**What:** Currently `cards.ts` builds audio URLs as `/audio/${hash}` paths (relative, API-served). After Phase 6 the storage_url in `audio_clips` is a full `https://` CDN URL. The routes must JOIN `audio_clips` to get `storage_url` and emit it directly.

**Two valid approaches — planner must pick one:**

**Option A (recommended): JOIN + emit storage_url directly**

- Change `GET /cards`, `GET /cards/due`, `GET /cards/:id`, and any home/recent endpoints that return audio_url to JOIN the `audio_clips` table on `sentence_audio_clip_hash` and emit `storage_url` as the audio_url
- Change mobile `api.ts` to stop prepending `BASE` for audio_url fields (they are now absolute https:// URLs)
- Pro: removes the `/audio/:hash` API route entirely; audio loads from CDN directly; no API bandwidth for audio
- Con: requires updating 4+ route handlers and the mobile API client; more code to change atomically

**Option B (minimal client change): 302 redirect in /audio/:hash**

- Keep `GET /audio/:hash` but change it to look up `audio_clips.storage_url` from the DB and 302-redirect to the CDN URL
- Mobile client doesn't change; it still fetches `/audio/:hash` from the API
- Pro: zero mobile changes; low blast radius
- Con: defeats "removes API bandwidth for audio" goal; two HTTP round-trips per audio play; does not achieve AUTH-03's spirit

Option A is recommended. It achieves the stated goal and is consistent with the architecture diagram (mobile fetches CDN directly).

**Two audio columns, not one:** Cards have both `sentence_audio_clip_hash` and (potentially) `audio_clip_hash`. The join in Option A must cover both columns — two left joins to `audio_clips` with different aliases (e.g., `sentenceClip` and `wordClip`). The current V0 code emits `sentence_audio_url` and `audio_url` separately; both must be updated.

```typescript
// apps/api/src/routes/cards.ts — after migration (simplified example)
// Source: drizzle-orm join pattern [ASSUMED]
const allCards = await db
  .select({
    ...cards,
    sentence_audio_url: audioClips.storage_url, // direct CDN URL
  })
  .from(cards)
  .leftJoin(audioClips, eq(cards.sentence_audio_clip_hash, audioClips.content_hash))
  .where(eq(cards.user_id, userId))
  .orderBy(desc(cards.created_at));
// No more: sentence_audio_url: card.sentence_audio_clip_hash ? `/audio/${card.sentence_audio_clip_hash}` : null
```

```typescript
// apps/mobile/src/lib/api.ts — after migration
// REMOVE the BASE prepend logic:
// BEFORE:
//   audio_url: c.audio_url ? `${BASE}${c.audio_url}` : null,
// AFTER:
//   audio_url: c.audio_url ?? null,  // already an absolute https:// URL
```

### Pattern 4: Supabase Storage Upload (API Server)

**What:** API server uploads MP3 buffer to Supabase Storage after TTS synthesis.
**When to use:** In `synthesize()` call path after writing the buffer, and in the backfill migration script.

```typescript
// apps/api/src/lib/storage.ts
// Source: supabase.com/docs/guides/storage/uploads/standard-uploads [CITED]
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!, // bypasses Storage RLS — server-side only
);

export async function uploadAudio(hash: string, buffer: Buffer): Promise<string> {
  const path = `${hash}.mp3`;

  const { error } = await supabase.storage.from('audio').upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: false, // content-addressed: same hash = same file, never overwrite
  });

  if (error && error.message !== 'The resource already exists') {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('audio').getPublicUrl(path);
  return data.publicUrl; // https://<ref>.supabase.co/storage/v1/object/public/audio/<hash>.mp3
}
```

**Key insight:** `getPublicUrl()` is synchronous — it constructs the URL from the project ref and path without a network call. The bucket must be set to public in the Supabase dashboard. [CITED: supabase.com/docs/reference/javascript/storage-from-getpublicurl]

### Pattern 5: Audio Migration Script

**What:** One-time backfill — read all `audio_clips` where `storage_url` starts with `/` (local path), upload to Storage, update the row.
**When to use:** Run once during Phase 6 migration; delete the script after verification.

```typescript
// scripts/migrate-audio-to-storage.ts
import { db, audio_clips } from '@portuguese-app/db';
import { like, eq } from 'drizzle-orm'; // eq import is required
import { uploadAudio } from '../apps/api/src/lib/storage.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AUDIO_CACHE_DIR = resolve(process.cwd(), 'audio-cache');
const localClips = await db.select().from(audio_clips).where(like(audio_clips.storage_url, '/%'));

for (const clip of localClips) {
  const buffer = readFileSync(resolve(AUDIO_CACHE_DIR, `${clip.content_hash}.mp3`));
  const publicUrl = await uploadAudio(clip.content_hash, buffer);
  await db
    .update(audio_clips)
    .set({ storage_url: publicUrl })
    .where(eq(audio_clips.content_hash, clip.content_hash));
  console.log(`Migrated ${clip.content_hash} → ${publicUrl}`);
}

console.log('Migration complete. Verify audio playback before removing audio-cache/');
```

### Pattern 10: Audio Write-Path for New Cards (post-migration)

**What:** After Phase 6, every new card created via `POST /cards` or `PATCH /cards/:id` must upload audio to Supabase Storage and store the CDN URL — not a local file path. The current `synthesize()` function returns `audioUrl: filePath` (a local filesystem path), not a Storage URL. The write path in `cards.ts` must be updated to call `uploadAudio()` after synthesis.

**Key constraint from reading `tts.ts`:** `synthesize()` writes the buffer to `audio-cache/${hash}.mp3` and returns `{ audioUrl: filePath, durationMs }`. The buffer is available at synthesis time. There are two integration options:

**Option W1 (recommended): Wrap synthesize() at the call site in cards.ts**

- After `synthesize(text)` returns the `filePath`, read the buffer from disk and call `uploadAudio(hash, buffer)`
- `synthesize()` stays unchanged — `audio-cache/` still serves as a local cache/dedup layer
- Pro: minimal change; `audio-cache/` prevents redundant Narakeet API calls; clean separation
- Con: extra `readFileSync` call (buffer was already in memory during synthesis)

**Option W2: Return buffer from synthesize() alongside filePath**

- Refactor `TTSResult` to include `buffer: Buffer`; store on disk AND return buffer
- `cards.ts` passes the buffer directly to `uploadAudio()` — no disk read-back
- Pro: no extra I/O; cleaner data flow
- Con: changes the `TTSProvider` interface, which ADR 0005 says must be stable

Option W1 is recommended — preserves the provider boundary per ADR 0005.

```typescript
// apps/api/src/routes/cards.ts — updated POST /cards (simplified)
// Source: pattern derived from reading tts.ts + storage.ts [CITED: codebase]
import { synthesize, contentHash } from '../../../mobile/src/providers/tts.js';
import { uploadAudio } from '../lib/storage.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const AUDIO_CACHE_DIR = resolve(process.cwd(), 'audio-cache');

// Inside the POST /cards handler, after getting selected_sentence:
const sentenceAudio = await synthesize(selected_sentence);
const sentenceHash = contentHash(selected_sentence);

// New: upload to Storage; sentenceAudio.audioUrl is the local file path
const audioBuffer = readFileSync(sentenceAudio.audioUrl); // path returned by synthesize()
const storageUrl = await uploadAudio(sentenceHash, audioBuffer);

await db
  .insert(audio_clips)
  .values({
    content_hash: sentenceHash,
    text: selected_sentence,
    provider: 'narakeet',
    voice_id: 'felipe',
    storage_url: storageUrl, // now an https:// URL, not a local path
    duration_ms: sentenceAudio.durationMs,
  })
  .onConflictDoNothing();
```

**The `onConflictDoNothing()` behavior:** If the audio_clip already exists (content-addressed), the insert is skipped but `storageUrl` is still used by the card. The existing row in `audio_clips` should already have a valid Storage URL after the one-time migration. For safety, the code should handle the conflict case by fetching the existing `storage_url` if the insert is skipped — or rely on `uploadAudio()` returning the URL even for already-uploaded files (`upsert: false` + handling "resource already exists" error).

**Edit sites for the write path:**

- `apps/api/src/routes/cards.ts` POST handler (~line 64): approve card + synthesize sentence audio
- `apps/api/src/routes/cards.ts` PATCH handler (~line 208): re-synthesize when sentence changes
- Both sites must call `uploadAudio()` and store the returned https:// URL in `audio_clips.storage_url`

### Pattern 6: Mobile Supabase Client with LargeSecureStore

**What:** `createClient` with a custom storage adapter that encrypts the session with AES-256, storing the key in SecureStore and the payload in AsyncStorage.
**When to use:** Create once in `apps/mobile/src/lib/supabase.ts`; import the `supabase` singleton everywhere on mobile.

```typescript
// apps/mobile/src/lib/supabase.ts
// Source: supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native [CITED]
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import * as StableBase64 from 'base64-js';
import { createClient } from '@supabase/supabase-js';

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, StableBase64.fromByteArray(encryptionKey));
    return StableBase64.fromByteArray(encryptedBytes);
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyStr = await SecureStore.getItemAsync(key);
    if (!encryptionKeyStr) return null;
    const encryptionKey = StableBase64.toByteArray(encryptionKeyStr);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const decryptedBytes = cipher.decrypt(StableBase64.toByteArray(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this._decrypt(key, encrypted);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string) {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL']!;
const supabaseAnonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Pattern 7: AppState Token Refresh (Mobile)

**What:** Pause/resume the auto-refresh when the app goes to background to save battery and ensure tokens are valid on foreground.
**When to use:** In the root `_layout.tsx` or an auth provider.

```typescript
// Source: supabase.com/docs/guides/auth/quickstarts/react-native [CITED]
import { AppState } from 'react-native';
import { supabase } from '@/src/lib/supabase';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

### Pattern 8: users Table — Trigger-Based Profile Creation

**What:** A Postgres trigger on `auth.users` auto-inserts a row into `public.users` when Supabase Auth creates a new user. This keeps the existing FK relationships intact.
**When to use:** Create this trigger as part of the Phase 6 DB migration.

**CRITICAL sequencing:** The V0 hardcoded user row (`00000000-0000-0000-0000-000000000001`) is NOT in `auth.users`. Adding a `REFERENCES auth.users(id)` FK constraint while the V0 row exists will fail. Correct order:

1. Create the trigger (so new sign-ups auto-create a `public.users` row)
2. Sign up as the real user → get their UUID
3. Run `UPDATE cards/lemmas/etc SET user_id = '<new-uuid>' WHERE user_id = '00000000-0000-0000-0000-000000000001'`
4. `DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001'`
5. Only then add the `REFERENCES auth.users(id)` FK constraint (optional; Drizzle schema.ts update)

```sql
-- Run as raw SQL migration (not a Drizzle schema.ts change — auth schema is external)
-- Source: supabase.com/docs/guides/auth/managing-user-data [CITED]
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**CRITICAL:** If this trigger fails (e.g., display_name constraint), it blocks sign-up entirely. The `coalesce` fallback to `split_part(new.email, '@', 1)` ensures display_name is never null. Test with a sign-up that provides no display_name metadata.

### Pattern 9: Mobile API Client — Attach JWT

**What:** Modify `api.ts`'s `request()` helper to get the current session from `supabase.auth.getSession()` and attach the access token as a Bearer header.
**When to use:** All API calls after auth is wired.

```typescript
// apps/mobile/src/lib/api.ts — modify request() helper
import { supabase } from './supabase';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}
```

### Anti-Patterns to Avoid

- **Using `V0_USER_ID` as a fallback in auth middleware:** Once auth is live, requests without a valid JWT must return 401, not fall through to the hardcoded user.
- **Using `supabase-js` for DB queries in the API:** ADR 0007 rule 1 forbids this. The Supabase client in the API is for Storage only.
- **Private Storage bucket for audio:** Audio is content-addressed (hash = SHA-256 of text+provider+voice). Files are non-secret. Use a public bucket so mobile clients can play audio directly from the CDN URL without a signed URL round-trip.
- **Storing `SUPABASE_SERVICE_ROLE_KEY` in mobile app env vars:** This key bypasses all RLS. It must only live in the API's server environment.
- **Adding `@supabase/supabase-js` as a DB-level dependency in `packages/db`:** The DB package uses the `pg` driver directly. Keep Supabase client in `apps/api` only.
- **Storing JWT in plain AsyncStorage:** Session tokens should be encrypted. Use the LargeSecureStore pattern.
- **Building `/audio/${hash}` paths in cards routes after migration:** Once `audio_clips.storage_url` holds https:// URLs, the routes must emit `storage_url` directly. Constructing `/audio/${hash}` paths will produce broken URLs after the route is removed.
- **Prepending `BASE` to audio_url in mobile api.ts after migration:** The storage_url is already an absolute https:// URL. `${BASE}${https://...}` produces a doubly-prefixed broken URL.
- **Adding FK constraint before V0 row is removed:** `REFERENCES auth.users(id)` will fail if the V0 UUID is not in `auth.users`. Delete the V0 row first, then add the constraint.

---

## Don't Hand-Roll

| Problem                         | Don't Build                                | Use Instead                                            | Why                                                          |
| ------------------------------- | ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------ |
| Session storage in React Native | Custom keychain/encryption                 | LargeSecureStore (SecureStore + AsyncStorage + aes-js) | SecureStore 2048-byte limit; Supabase sessions exceed it     |
| JWT verification                | Manual base64 decode + HMAC                | Hono built-in `jwk()` or `jwt()` middleware            | Handles ES256/HS256, exp/nbf checks, context injection       |
| Auth token refresh on mobile    | Manual refresh timer                       | `supabase.auth.startAutoRefresh()` + AppState listener | Handles token expiry, background/foreground transitions      |
| Audio URL generation            | Constructing Supabase Storage URLs by hand | `supabase.storage.from('audio').getPublicUrl(path)`    | Synchronous, stable format, no network call                  |
| Profile auto-creation           | App-level POST to create users on sign-up  | Postgres trigger on `auth.users`                       | Atomic with sign-up; cannot be skipped if client disconnects |

**Key insight:** The biggest footgun in this migration is the audio read-path change. Migrating data in `audio_clips.storage_url` is not sufficient — the cards routes must also change how they construct the `audio_url` field, and the mobile API client must stop prepending `BASE`. All three changes must happen atomically or in the correct order to avoid broken audio.

---

## Runtime State Inventory

This is a migration phase. The following categories were explicitly checked:

| Category            | Items Found                                                                                                                                   | Action Required                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored data         | `public.users` table has 1 row: `id = '00000000-0000-0000-0000-000000000001'` (V0_USER_ID). All cards, lemmas, pending_cards FK to this UUID. | Data migration: sign up real user → UPDATE FKs → DELETE V0 row → optionally add auth.users FK constraint. Order matters (see Pattern 8 note). |
| Stored data         | `audio_clips.storage_url` contains local filesystem paths for all existing clips                                                              | Data migration: one-time script uploads each local .mp3 to Supabase Storage, updates storage_url to public https:// URL                       |
| Stored data         | `audio-cache/` directory on API server contains all existing MP3s — migration source                                                          | Retain until migration confirmed; not a source of truth after migration                                                                       |
| Live service config | Supabase project already provisioned. 4 env vars missing from `.env`.                                                                         | Add: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` from dashboard                                   |
| Live service config | Mobile app has no Supabase keys today                                                                                                         | Add to `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`                                                                    |
| OS-registered state | None — no OS-level registrations of app or service names                                                                                      | None                                                                                                                                          |
| Secrets/env vars    | `DATABASE_URL` unchanged, still used by Drizzle. New Supabase keys are additive.                                                              | Add new Supabase keys alongside existing DATABASE_URL                                                                                         |
| Build artifacts     | `audio-cache/` MP3 files — migration source, not a stale artifact                                                                             | Retain until migration confirmed successful                                                                                                   |

**V0_USER_ID data migration — two valid options:**

Option A (recommended): Sign up real user → get UUID → `UPDATE cards/lemmas/pending_cards SET user_id = '<new-uuid>' WHERE user_id = '00000000-0000-0000-0000-000000000001'` → `DELETE FROM public.users WHERE id = '...'`. Then optionally add FK constraint. Pro: clean state. Practical for a personal tool with one user.

Option B (parallel): Keep V0 row during development; add real user side-by-side; run the UPDATE when ready. Safer for iterative development.

---

## Common Pitfalls

### Pitfall 1: Postgres Role Bypasses RLS Silently

**What goes wrong:** Developer enables RLS on `cards` table, writes policies using `auth.uid()`, and assumes the API enforces isolation via RLS. But the API connects as the `postgres` role, which has `BYPASSRLS` in Supabase's default setup. All policies are silently ignored for API queries.
**Why it happens:** The "standard" Supabase RLS story assumes PostgREST or supabase-js sets `auth.uid()` context via JWT. The raw `pg` driver with `postgres` role does not set this context.
**How to avoid:** Per ADR 0007 rule 3, app-code Drizzle `WHERE user_id = $userId` clauses are the primary authorization layer. RLS is an optional defense-in-depth only (see Open Question 4 for how to make it effective if desired).
**Warning signs:** Querying as a second user and seeing another user's cards appear — this indicates a missing WHERE clause in a route, not an RLS failure. [CITED: supabase.com/docs/guides/database/postgres/row-level-security]

### Pitfall 2: LargeSecureStore Pattern Required for Expo

**What goes wrong:** Developer uses `storage: AsyncStorage` directly in `createClient`. Sessions silently truncate because Expo's `SecureStore.setItemAsync` has a 2048-byte limit; JWT sessions typically exceed this.
**Why it happens:** The simple AsyncStorage path appears first in Supabase docs; the LargeSecureStore section is in the "enhanced security" variant.
**How to avoid:** Always use the LargeSecureStore pattern (SecureStore for AES key, AsyncStorage for encrypted payload). [CITED: supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native]
**Warning signs:** Sign-in appears to succeed but session is lost on app restart; `getSession()` returns null despite successful sign-in.

### Pitfall 3: JWT Signing Key Algorithm Mismatch

**What goes wrong:** Developer configures Hono's `jwt()` middleware with `alg: 'HS256'` and a shared secret, but the project uses ES256 (likely for a 2026-created project). All requests return 401. Or vice versa.
**Why it happens:** Algorithm changed as default for new Supabase projects (Oct 2025). Hono's `jwk` and `jwt` middlewares are separate imports; `hono/jwt` rejects tokens it cannot verify with HS256.
**How to avoid:** Check Supabase dashboard → Settings → JWT first. If ES256: use `hono/jwk` with `jwks_uri`. If HS256: use `hono/jwt` with `secret`. Do this before writing auth middleware. [CITED: supabase.com/docs/guides/auth/signing-keys, hono.dev/docs/middleware/builtin/jwk]
**Warning signs:** Hono middleware returns 401 on all requests even with valid Supabase tokens; Supabase client on mobile shows successful sign-in but API rejects the access token.

### Pitfall 4: Trigger Failure Blocks Sign-up

**What goes wrong:** The `on_auth_user_created` trigger tries to insert a `public.users` row, but throws (e.g., `display_name` has a NOT NULL constraint without a default), causing the entire sign-up to fail.
**Why it happens:** `public.users.display_name` is NOT NULL in the current schema. `new.raw_user_meta_data` won't always contain a `display_name`.
**How to avoid:** Always `COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))` in the trigger. Accept `display_name` as a required field at sign-up on mobile. [CITED: supabase.com/docs/guides/auth/managing-user-data]
**Warning signs:** Sign-up API call returns a 500 or auth error; Supabase auth logs show trigger failure.

### Pitfall 5: Audio Migration Runs Before Storage Upload Verified

**What goes wrong:** The migration script updates `audio_clips.storage_url` to the https:// URL before verifying the upload succeeded (or while a prior upload failed silently).
**Why it happens:** Storage uploads can fail and the script continues to update the DB row.
**How to avoid:** Update `storage_url` only AFTER `uploadAudio()` returns without throwing. Use `upsert: false` so conflict throws rather than silently no-ops. Run migration in stages: upload all files first, verify via `getPublicUrl`, then run the DB update. Keep `audio-cache/` files until migration is confirmed. [CITED: supabase.com/docs/guides/storage/uploads/standard-uploads]
**Warning signs:** Audio plays for some cards but not others; `storage_url` shows a Supabase URL but HTTP GET returns 404.

### Pitfall 6: V0_USER_ID Left in One Route, Audio URL Not Updated, or New Card Write-Path Missed

**What goes wrong:** Three related failures, all stemming from an incomplete migration:

1. `V0_USER_ID` missed in one route file — that route silently scopes to the wrong user
2. Cards routes still build `/audio/${hash}` paths after migration — audio broken on migrated cards (reads succeed but URLs resolve to a removed route)
3. `POST /cards` or `PATCH /cards/:id` still writes `sentenceAudio.audioUrl` (a local file path) to `audio_clips.storage_url` — every new card after Phase 6 regresses to a local path, silently breaking audio for new cards while migrated ones work

**Why it happens:** V0_USER_ID is in 11+ locations. Audio URL construction is in 4+ places in cards.ts. The write-path (synthesize + store) is in 2 handler sites. The mobile api.ts has 3 places that prepend `${BASE}${c.audio_url}`. These are separate code sites that must all be updated together.
**How to avoid:** (1) Remove V0_USER_ID export from `constants.ts` entirely — TypeScript compile error catches remaining uses. (2) Grep for `` `/audio/${`` to find URL construction sites. (3) Grep for `sentenceAudio.audioUrl` to find write-path sites — both must call `uploadAudio()`. (4) Remove BASE prepend in api.ts. (5) Delete `GET /audio/:hash` route last, after verifying all URL construction is gone.
**Warning signs:** TypeScript compile error on `V0_USER_ID` (ideal); cross-user data visible in one screen; migrated cards play audio but newly created cards have no audio; `audio_clips.storage_url` contains local paths for newly created cards after Phase 6 is deployed.

### Pitfall 7: Auth Screen Navigation Loop

**What goes wrong:** Expo Router's root `_layout.tsx` conditionally renders auth screens vs. tab screens based on session state. If the session check is async and `null` during load, the app flickers between auth and app screens on each launch.
**Why it happens:** `supabase.auth.getSession()` is async; `onAuthStateChange` fires after the initial render.
**How to avoid:** Use `supabase.auth.onAuthStateChange` as the source of truth. Keep a loading state (`isLoading = true`) until the first auth state event fires; render a loading/splash screen during this period. [CITED: supabase.com/docs/guides/auth/quickstarts/react-native]
**Warning signs:** App flickers briefly to login screen before showing home tab on authenticated launch.

---

## Code Examples

### Supabase client (mobile)

```typescript
// apps/mobile/src/lib/supabase.ts — see Pattern 6 above for full implementation
// Source: supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native [CITED]
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Sign-up and Sign-in (mobile)

```typescript
// Source: supabase.com/docs/guides/auth/quickstarts/react-native [CITED]
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { data: { display_name: displayName } }, // required: triggers display_name in profile
});

const { data, error } = await supabase.auth.signInWithPassword({ email, password });

const {
  data: { session },
} = await supabase.auth.getSession();
const accessToken = session?.access_token; // Bearer token for Authorization header
```

### Hono JWK middleware (API) — ES256 primary path

```typescript
// Source: hono.dev/docs/middleware/builtin/jwk [CITED]
import { jwk } from 'hono/jwk';
app.use(
  '/*',
  jwk({
    jwks_uri: `${process.env['SUPABASE_URL']}/auth/v1/.well-known/jwks.json`,
    alg: ['ES256'],
  }),
);
const { sub: userId } = c.get('jwtPayload') as { sub: string };
```

### Storage upload after TTS synthesis (API)

```typescript
// Source: supabase.com/docs/guides/storage/uploads/standard-uploads [CITED]
const { error } = await supabase.storage.from('audio').upload(`${hash}.mp3`, buffer, {
  contentType: 'audio/mpeg',
  upsert: false,
});
const { data } = supabase.storage.from('audio').getPublicUrl(`${hash}.mp3`);
const publicUrl = data.publicUrl; // store in audio_clips.storage_url
```

---

## State of the Art

| Old Approach                                                           | Current Approach                                       | When Changed | Impact                                                                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------ |
| HS256 JWT secret for all Supabase projects                             | Asymmetric ES256/JWKS for new projects (post-Oct 2025) | Oct 2025     | Must verify signing key type in dashboard; `hono/jwk` vs `hono/jwt` are different imports                    |
| `@react-native-async-storage/async-storage` alone for Supabase session | LargeSecureStore (SecureStore + AES)                   | Ongoing      | Prevents session truncation and stores tokens encrypted                                                      |
| Local file serving (`GET /audio/:hash` → readStream)                   | Supabase Storage public CDN URL                        | Phase 6      | Mobile fetches audio directly from CDN; removes API bandwidth; requires cards routes + mobile api.ts changes |
| Hono `jwt()` middleware with JWKS option                               | Separate `hono/jwk` middleware for asymmetric keys     | Recent       | `hono/jwt` handles HS256; `hono/jwk` handles ES256/RS256; they are distinct imports                          |

**Deprecated/outdated:**

- `V0_USER_ID` constant: intentionally removed in Phase 6.
- `GET /audio/:hash` route: replaced by direct CDN URLs after migration (Option A) or kept as redirect (Option B).
- `audio-cache/` directory as source of truth: local dev cache only after migration.
- `audio_url: c.audio_url ? \`${BASE}${c.audio_url}\` : null` in mobile api.ts: removed after cards routes emit full https:// URLs.

---

## Assumptions Log

| #   | Claim                                                                                                                                                    | Section                   | Risk if Wrong                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | The Supabase project was created after Oct 2025 and uses ES256 signing keys (inferred from ADR dates: 2026-05, 2026-06)                                  | Standard Stack, Pattern 1 | If HS256, use `hono/jwt` with shared secret instead of `hono/jwk` — fundamentally different import and config. Verify in dashboard before coding.  |
| A2  | `audio_clips.storage_url` currently holds local filesystem paths (not cloud URLs)                                                                        | Runtime State Inventory   | If some clips already have cloud URLs, the migration script must filter to `LIKE '/%'` only (easy fix)                                             |
| A3  | Placing Storage upload in `apps/api/src/lib/storage.ts` is acceptable deviation from ADR 0005 (AudioStorageProvider)                                     | Project Constraints       | If user requires strict ADR 0005 compliance, the interface must go in `apps/mobile/src/providers/audio-storage/` — additional layer of indirection |
| A4  | Option A (JOIN + emit storage_url directly from cards routes) is the preferred audio read-path approach                                                  | Pattern 3                 | If user prefers Option B (redirect), mobile api.ts changes are minimized but API bandwidth goal is not achieved                                    |
| A5  | `audio-cache/${content_hash}.mp3` is the correct filename for migration script (verified: `tts.ts` writes `path.join(AUDIO_CACHE_DIR, \`${hash}.mp3\`)`) | Pattern 5                 | VERIFIED from tts.ts read: hash is SHA-256 of text+provider+voice; filename is `${hash}.mp3` — not assumed                                         |

---

## Open Questions

1. **JWT Signing Algorithm (Must resolve before coding auth middleware)**
   - What we know: New Supabase projects (post-Oct 2025) use ES256/JWKS by default. This project's ADRs date to 2026-05 and 2026-06, making ES256 likely.
   - What's unclear: Whether this specific Supabase project actually uses ES256 or HS256 (could have been created earlier and migrated)
   - Recommendation: Wave 0 task — open Supabase Dashboard → Settings → JWT and confirm the algorithm. If ES256: `hono/jwk` with JWKS URI. If HS256: `hono/jwt` with shared secret. This is a binary branch with different code.

2. **V0 User Data Migration Strategy**
   - What we know: All existing cards/reviews FK to V0_USER_ID (`00000000-0000-0000-0000-000000000001`). The first real user will have a different UUID. The FK constraint to auth.users cannot be added while V0 row exists.
   - What's unclear: Whether to (a) update all FKs to the new UUID, (b) start fresh (accept data loss), or (c) keep V0 row indefinitely and never add the FK constraint
   - Recommendation: Option A (update FKs) — personal tool with valuable card data. Include as a task: "sign up as real user, note UUID, run UPDATE script, delete V0 row."

3. **auth.users FK in Drizzle Schema**
   - What we know: `public.users.id` should semantically reference `auth.users.id` (Supabase-managed schema). The current schema.ts does not declare this FK.
   - What's unclear: Whether to express this in `schema.ts` via `pgSchema('auth')` table stub or just use raw SQL migration and leave schema.ts unchanged
   - Recommendation: Raw SQL for the trigger + optional FK — Drizzle's cross-schema FK to the Supabase-internal `auth` schema adds complexity. The trigger is more important than the FK constraint; do the FK only if V0 row migration is confirmed complete.

4. **RLS vs. App-Code Authorization (ADR 0007 Rule 3 vs. Roadmap Plan 2)**
   - What we know: The roadmap lists "Row-level security on all DB tables" as Plan 2 of Phase 6. ADR 0007 rule 3 says "app code is the primary authz layer." The `postgres` role has BYPASSRLS — RLS does not activate for API queries via the raw pg driver.
   - What's unclear: Does "Row-level security on all DB tables" mean (a) add RLS as defense-in-depth (knowing it only activates if a future non-postgres connection is used), (b) skip RLS per ADR 0007 and rely on app-code, or (c) provision a restricted `authenticator` role + `SET LOCAL ROLE authenticated` per transaction so RLS actually enforces during API queries?
   - Three options:
     - (a) Add RLS policies — defense-in-depth only, zero runtime effect until a different DB role is used. Low effort, low value for now.
     - (b) Skip RLS — correct per ADR 0007 rule 3; app-code WHERE clauses are sufficient. Simplest.
     - (c) Add restricted role + JWT context injection per transaction — RLS actually enforces for API queries. High complexity; effectively re-implementing PostgREST inside Hono.
   - Recommendation: Option (a) or (b). Do not choose (c) for Phase 6 — complexity outweighs benefit for a personal single-user tool. User must confirm which they mean by "Row-level security on all DB tables" in the roadmap.

---

## Environment Availability

| Dependency                             | Required By                          | Available                  | Version | Fallback                                                      |
| -------------------------------------- | ------------------------------------ | -------------------------- | ------- | ------------------------------------------------------------- |
| Supabase project (DB + Auth + Storage) | All plans                            | Assumed (already in use)   | —       | Dashboard provisioning required for Storage bucket            |
| `SUPABASE_URL` env var                 | API auth + storage                   | ✗ (not in .env)            | —       | Must add from Supabase dashboard → Settings → API             |
| `SUPABASE_ANON_KEY` env var            | Mobile client                        | ✗ (not in .env)            | —       | Must add from Supabase dashboard → Settings → API             |
| `SUPABASE_SERVICE_ROLE_KEY` env var    | API storage uploads                  | ✗ (not in .env)            | —       | Must add from Supabase dashboard → Settings → API             |
| `SUPABASE_JWT_SECRET` env var          | API JWT middleware (HS256 path only) | ✗ (not in .env)            | —       | Needed only for HS256; for ES256 JWKS path is unauthenticated |
| `EXPO_PUBLIC_SUPABASE_URL`             | Mobile supabase.ts                   | ✗ (not in .env)            | —       | Same value as SUPABASE_URL                                    |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`        | Mobile supabase.ts                   | ✗ (not in .env)            | —       | Same value as SUPABASE_ANON_KEY                               |
| `expo-secure-store`                    | Mobile LargeSecureStore              | ✓ (56.0.4 in package.json) | 56.0.4  | —                                                             |
| Node.js ≥ 18                           | `@supabase/supabase-js` server-side  | Assumed (verify)           | unknown | Upgrade if < 18                                               |

**Missing dependencies with no fallback:**

- Supabase Storage bucket named `audio` — must be created in the dashboard and set to public before the migration script runs
- The 6 missing env vars — Wave 0 task must document exactly where to find them and add them to `.env`

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json (treated as enabled).

### Test Framework

| Property           | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| Framework          | Vitest (vitest.config.ts at root)                          |
| Config file        | `/Users/graysonstricker/Programs/Consono/vitest.config.ts` |
| Quick run command  | `pnpm test`                                                |
| Full suite command | `pnpm test`                                                |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                          | Test Type   | Automated Command                | File Exists?   |
| ------- | ----------------------------------------------------------------- | ----------- | -------------------------------- | -------------- |
| AUTH-01 | Sign-up and sign-in flows produce valid sessions                  | manual      | — device test on physical device | ❌ manual-only |
| AUTH-01 | JWT middleware rejects requests without valid token (ES256 path)  | unit        | `pnpm test -- auth`              | ❌ Wave 0      |
| AUTH-01 | JWT middleware rejects requests without valid token (HS256 path)  | unit        | `pnpm test -- auth`              | ❌ Wave 0      |
| AUTH-02 | Per-user data scoping (user A cannot see user B's cards)          | integration | `pnpm test -- userScoping`       | ❌ Wave 0      |
| AUTH-03 | `uploadAudio()` returns a public https:// URL                     | unit        | `pnpm test -- storage`           | ❌ Wave 0      |
| AUTH-03 | Migrated audio_clips have no local paths remaining                | integration | `pnpm test -- migration`         | ❌ Wave 0      |
| AUTH-03 | Cards routes emit absolute https:// audio URLs (not /audio/:hash) | unit        | `pnpm test -- cards`             | ❌ Wave 0      |

### Sampling Rate

- **Per task commit:** `pnpm test`
- **Per wave merge:** `pnpm test`
- **Phase gate:** Full suite green + `checkpoint:human-verify` (cross-device: add card on device A, verify visible on device B; audio plays)

### Wave 0 Gaps

- [ ] `apps/api/src/lib/auth.test.ts` — JWT middleware unit tests (valid token accepted, invalid rejected, missing header returns 401)
- [ ] `apps/api/src/lib/storage.test.ts` — uploadAudio unit tests (mock supabase-js storage client)
- [ ] `apps/api/src/routes/cards.test.ts` — verify audio_url is an absolute https:// URL in response
- [ ] Cross-device verification: no automated test; requires human checkpoint with two physical devices

---

## Security Domain

> `security_enforcement` not set in config → treated as enabled.

### Applicable ASVS Categories

| ASVS Category         | Applies | Standard Control                                                                                                      |
| --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes     | Supabase Auth email/password; JWT Bearer tokens; session expiry and refresh                                           |
| V3 Session Management | yes     | LargeSecureStore (AES-256 encrypted, not plaintext AsyncStorage); `autoRefreshToken`; `stopAutoRefresh` on background |
| V4 Access Control     | yes     | Per-user `WHERE user_id` scoping in every query; JWT `sub` claim is the user identifier                               |
| V5 Input Validation   | yes     | Existing Zod validation on all route inputs; email/password validated by Supabase Auth                                |
| V6 Cryptography       | yes     | AES-256 for session encryption on device; HS256 or ES256 for JWT signing (Supabase-managed); never roll custom crypto |

### Known Threat Patterns

| Pattern                                 | STRIDE                 | Standard Mitigation                                                                                     |
| --------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| JWT forgery                             | Spoofing               | Verify signature with Supabase JWKS (ES256) or shared secret (HS256); never trust unverified payload    |
| IDOR (Insecure Direct Object Reference) | Elevation of Privilege | Every DB query includes `WHERE user_id = $jwt.sub`; reviews.ts must add card ownership check in Phase 6 |
| `SUPABASE_SERVICE_ROLE_KEY` exposure    | Information Disclosure | Server env only; never in mobile app or `EXPO_PUBLIC_*` env vars                                        |
| Session token theft from device storage | Information Disclosure | LargeSecureStore with AES-256 + SecureStore key; not plaintext                                          |
| Audio file unauthorized access          | Information Disclosure | Audio is in a public bucket — intentional (content-addressed, non-secret). No mitigation needed.        |

**IDOR note for `reviews.ts`:** `POST /reviews` does not verify that `card_id` belongs to the authenticated user. After auth is wired, a malicious actor could submit reviews for another user's cards. Fix required in Phase 6: verify card ownership before inserting review.

---

## Sources

### Primary (HIGH confidence)

- [ADR 0007](docs/decisions/0007-supabase-postgres-host.md) — architecture constraints (read from repo)
- [ADR 0005](docs/decisions/0005-provider-boundaries.md) — provider boundary rules (read from repo)
- [Supabase Auth React Native quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native) — LargeSecureStore pattern, AppState handling [CITED]
- [Supabase Expo User Management](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) — createClient config with SecureStore [CITED]
- [Supabase Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data) — trigger pattern for profiles table [CITED]
- [Supabase JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys) — HS256 vs ES256, JWKS endpoint [CITED]
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) — service role bypass, public bucket behavior [CITED]
- [Hono JWK middleware](https://hono.dev/docs/middleware/builtin/jwk) — `jwk({ jwks_uri, alg })`, ES256 asymmetric token verification [CITED]
- [Hono JWT middleware](https://hono.dev/docs/middleware/builtin/jwt) — `jwt({ secret, alg })`, HS256 symmetric verification [CITED]

### Secondary (MEDIUM confidence)

- [Supabase Postgres Roles](https://supabase.com/docs/guides/database/postgres/roles) — postgres role has admin/BYPASSRLS [CITED]
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — postgres role bypasses RLS by default [CITED]
- npm registry — all package versions verified via `npm view` [VERIFIED: npm registry]
- slopcheck — all packages rated [OK] [VERIFIED: slopcheck]
- [Hono JWK issue #4542](https://github.com/honojs/hono/issues/4542) — confirms `alg` is required; `kid` header matching behavior [CITED]

### Tertiary (LOW confidence)

- None — all critical claims are verified or cited.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified on npm registry + slopcheck; ADR 0007 explicitly names Supabase Auth + Storage; Hono JWK/JWT APIs confirmed from official docs
- Architecture: HIGH — derived from ADR 0007 constraints + codebase inspection of all affected files
- Pitfalls: HIGH — postgres BYPASSRLS, JWT algorithm, trigger failure, audio URL read-path all documented in official sources
- Audio read-path change: HIGH — confirmed by reading cards.ts (builds `/audio/${hash}`) and api.ts (prepends `${BASE}`)
- JWT algorithm default: MEDIUM — inferred from project creation date (ADRs dated 2026); must be confirmed in dashboard

**Research date:** 2026-06-29
**Valid until:** 2026-07-29 (stable ecosystem; Hono and Supabase Auth APIs stable)
