# Codebase Concerns

**Analysis Date:** 2026-05-18

---

## Tech Debt

**Sentence card pipeline is a stub using the word prompt:**

- Issue: `generate.ts` contains `// Sentence kind uses word prompt as placeholder at V0` — when `kind === 'sentence'`, it calls `extractWordFields(input_text)` using the word-extraction prompt, treating the full sentence as a word. This yields nonsensical card fields (lemma, gender, gendered_form, etc.) for sentence inputs.
- Files: `apps/api/src/routes/generate.ts` (line 32)
- Impact: Sentence cards created via the `sentence` flow have wrong metadata. The flow is accessible in the UI ("Paste a sentence" button on home screen and add screen toggle) but produces broken cards.
- Fix approach: Implement a separate `extractSentenceFields` prompt in `prompts/card-generation/` that takes a full sentence and returns only sentence-appropriate fields (`image_search_query`, optional gloss). Route `kind === 'sentence'` to that function.

**Sentence TTS audio is never generated:**

- Issue: `cards.ts` (POST `/cards`) does not call `synthesize()` for the chosen sentence. `sentence_audio_clip_hash` is always `null` on new cards. The review screen references `sentence_audio_url` (mapped from `sentence_audio_clip_hash`) but the "▶ play" button for the sentence only appears when that field is non-null — meaning it never appears for any card created through the current pipeline.
- Files: `apps/api/src/routes/cards.ts` (lines 73–101), `apps/mobile/app/review/index.tsx` (lines 283–296)
- Impact: Every card is missing sentence audio. A core V0 success criterion ("Audio is non-negotiable") is only half-satisfied — lemma audio exists, sentence audio does not.
- Fix approach: In the POST `/cards` handler, after inserting the card, call `synthesize(selected_sentence)`, upsert the resulting `audio_clip`, and set `sentence_audio_clip_hash` on the card row.

**`audio_clips.storage_url` stores a local file path instead of a remote URL:**

- Issue: `generate.ts` stores `audio.audioUrl` into `audio_clips.storage_url`. `TTSResult.audioUrl` is the local filesystem path (e.g., `/path/to/audio-cache/<hash>.mp3`), not a Supabase Storage URL. The comment in `audio.ts` acknowledges this: "serves local MP3 until Supabase Storage is wired (ADR 0007)".
- Files: `apps/api/src/routes/generate.ts` (line 50), `apps/mobile/src/providers/tts.ts` (line 37)
- Impact: `storage_url` in the DB is always a local absolute path. If the server restarts with a different working directory or the audio-cache is cleared, old `storage_url` values are stale. Cloud sync is not achieved — audio only works when the API server is local and the cache directory is intact.
- Fix approach: Complete ADR 0007 implementation: upload the synthesized MP3 to Supabase Storage bucket and store the resulting CDN URL in `storage_url`. Update the audio route to redirect to Supabase Storage instead of serving from disk.

**Hardcoded user display name "Léo" in UI (different from seed name "Grayson"):**

- Issue: The home screen greetings hard-code `"Léo"` in four separate `Text` nodes. The seed script inserts `display_name: 'Grayson'`. There is no API call to fetch the user's display name.
- Files: `apps/mobile/app/(tabs)/index.tsx` (lines 90, 101, 114, 133), `apps/api/src/seed.ts` (line 6)
- Impact: Personal daily-driver shows the wrong name on every screen state. Name mismatch between seed and UI is confusing. When auth lands at V1, greeting will still be hard-coded.
- Fix approach: Add a `GET /users/me` endpoint returning `display_name`. Fetch it with TanStack Query and pass to greeting components.

**`draft_json` field is cast with `as` instead of parsed with Zod:**

- Issue: `cards.ts` line 48 casts `pending.draft_json as { fields: { ... }; audio_hash: string }` without runtime validation. This is an unguarded `as` cast on a `jsonb` column that could contain anything if the `pending_cards` row was written by a different code version or corrupted.
- Files: `apps/api/src/routes/cards.ts` (lines 48–59)
- Impact: Violates the project's own rule "Every LLM output is validated through a Zod schema before use." A schema mismatch would produce a runtime crash with an unreadable error or, worse, silently insert incorrect data into the `cards` table.
- Fix approach: Define a `DraftJsonSchema` in `prompts/card-generation/extract-word-fields.ts` or a shared schema file and call `DraftJsonSchema.parse(pending.draft_json)` before reading `draft.fields`.

**`ImageResult` type is defined in two separate files:**

- Issue: `apps/mobile/src/providers/image-search.ts` exports `ImageResult` as a Zod-derived type. `apps/mobile/src/lib/api.ts` re-declares an identical `interface ImageResult`. These are parallel definitions with no shared import.
- Files: `apps/mobile/src/providers/image-search.ts` (line 20), `apps/mobile/src/lib/api.ts` (lines 18–21)
- Impact: If the image search provider's shape changes (e.g., adding a `width`/`height` field), only the provider type gets updated; the API client type stays stale and TypeScript won't catch the divergence because they're unrelated types.
- Fix approach: Remove the `interface ImageResult` from `api.ts` and re-export from `@/src/providers/image-search.ts`, or place the shared interface in a `packages/` shared types package.

**`ThemeContext` / `Surface` / `useTheme` is scaffolded but not consumed:**

- Issue: `apps/mobile/src/lib/theme.ts` defines `Surface` ('light' | 'color' | 'oled'), `ThemeContext`, and `useTheme()`. The root layout (`app/_layout.tsx`) provides it. No screen or component calls `useTheme()` — all screens use hard-coded class strings like `className="flex-1 bg-white"`.
- Files: `apps/mobile/src/lib/theme.ts`, `apps/mobile/app/_layout.tsx` (line 11)
- Impact: Dead scaffolding. If dark-mode or OLED surface is added later, the theme system exists but all screens must be updated manually because none currently read surface values.
- Fix approach: Either wire screens to `useTheme()` now or remove the scaffolding until it's needed (keeping ADR if needed). For V0 personal driver, deferral is fine — just acknowledge the gap.

**`playAudio` useEffect is missing `playAudio` in its dependency array:**

- Issue: `review/index.tsx` line 60–65 has `useEffect(() => { ... playAudio(currentCard.audio_url); }, [phase, index])`. `playAudio` is a `useCallback` but is omitted from the dep array. ESLint `react-hooks/exhaustive-deps` would flag this; however, ESLint config does not include React hooks rules (no `eslint-plugin-react-hooks` in the root eslint config).
- Files: `apps/mobile/app/review/index.tsx` (lines 60–65)
- Impact: In practice harmless because `playAudio` is stable (empty dep array on `useCallback`), but technically incorrect and will generate lint warnings once hooks rules are added.
- Fix approach: Add `playAudio` to the dependency array, or add `// eslint-disable-next-line react-hooks/exhaustive-deps` with an explanatory comment.

---

## Known Bugs

**Sentence card approval always saves `card_kind: 'word'`:**

- Symptoms: In `cards.ts` POST handler, `card_kind` is hard-coded to `'word'` (line 77). Sentence-mode cards are saved with `card_kind: 'word'` regardless of `input_kind`.
- Files: `apps/api/src/routes/cards.ts` (line 77)
- Trigger: Create a card using the sentence flow.
- Workaround: None — both word and sentence cards stored identically.

**`approveMutation` in Add screen has no `onError` handler:**

- Symptoms: If card approval fails (network error, duplicate lemma race, etc.), the user sees a red error text in `ReviewStep` only if `approveMutation.error` is non-null, but there is no state reset or retry UX — the "Save card" button stays present with no feedback beyond the inline error message.
- Files: `apps/mobile/app/(tabs)/add/index.tsx` (lines 42–57)
- Trigger: Network failure or server error during card approval.
- Workaround: User can tap "Save card" again.

**`getStreakState` uses `streakCount` hardcoded to `1`, so streak logic never activates:**

- Symptoms: `streakCount` is always `1` in `HomeScreen`. `getStreakState` returns `'inactive'` when `streakCount <= 1`. The StreakChip always shows "1" and is always in the inactive state. The "at-risk" state (after 18:00 with due cards) is unreachable because `streakCount <= 1` short-circuits.
- Files: `apps/mobile/app/(tabs)/index.tsx` (lines 41–44)
- Trigger: Every app launch.
- Workaround: None until a real streak endpoint exists.

---

## Security Considerations

**API has no authentication middleware:**

- Risk: All API endpoints (`/generate`, `/cards`, `/cards/due`, `/reviews`, `/audio/:hash`) accept any request without a token. Any process that can reach port 3000 can read all cards and submit reviews.
- Files: `apps/api/src/index.ts`, all route files under `apps/api/src/routes/`
- Current mitigation: V0 is personal/local — API only reachable on localhost. Documented as intentional V0 shortcut (ADR 0007 defers auth to V1).
- Recommendations: Before any network exposure (home LAN, Expo Go on phone connecting to local API), add a static shared secret header check as a minimal V0 guard. Real auth (Supabase Auth) is the V1 path.

**`EXPO_PUBLIC_API_URL` has no validation — defaults to `http://localhost:3000`:**

- Risk: The base URL is read from `process.env['EXPO_PUBLIC_API_URL']` with no validation. An empty string, trailing slash, or malformed URL would produce broken fetch calls with confusing error messages.
- Files: `apps/mobile/src/lib/api.ts` (line 1)
- Current mitigation: None.
- Recommendations: Assert the env var is a valid URL at app start, or at minimum strip trailing slashes.

---

## Performance Bottlenecks

**All due cards fetched on every review submission:**

- Problem: `reviewMutation.onSuccess` calls `queryClient.invalidateQueries({ queryKey: ['cards', 'due'] })` after every individual card rating. This triggers a re-fetch of the full due-cards list from the API after each of N cards in a session.
- Files: `apps/mobile/app/review/index.tsx` (lines 34–37), `apps/mobile/app/(tabs)/add/index.tsx` (lines 55–56)
- Cause: `invalidateQueries` on a key that is actively in use triggers an immediate background refetch.
- Improvement path: Manage the review queue locally (remove rated card from the in-memory list) and only invalidate when the session ends. The done-screen handler already does a final invalidate (line 171) — remove the per-card invalidate in `reviewMutation.onSuccess`.

**Generate endpoint does LLM + TTS + image search sequentially for LLM, then parallel for TTS/images:**

- Problem: `generate.ts` awaits `extractWordFields()` first, then fans out to `Promise.all([synthesize, searchImages])`. This is correct, but if sentence audio generation is added to `cards.ts` approval (the fix for the missing-sentence-audio concern above), the approval endpoint will also incur a TTS call synchronously, blocking the response.
- Files: `apps/api/src/routes/generate.ts` (lines 35–38), `apps/api/src/routes/cards.ts`
- Cause: Synchronous TTS in the request/response cycle.
- Improvement path: Acceptable at V0 personal-driver scale. At V1+, move TTS generation to a background job.

---

## Fragile Areas

**`pending_cards` rows stuck in `'generating'` state on server crash:**

- Files: `apps/api/src/routes/generate.ts`
- Why fragile: If the API process crashes between inserting the `pending_card` with `status: 'generating'` (line 26) and completing the try/catch that sets status to `'ready_for_review'` or `'discarded'`, the row remains `'generating'` forever. There is no cleanup job or TTL on pending rows.
- Safe modification: Add a startup cleanup query: `UPDATE pending_cards SET status = 'discarded' WHERE status = 'generating' AND updated_at < now() - interval '5 minutes'`. Run it on API startup in `index.ts`.
- Test coverage: None.

**`lemma` query after `onConflictDoNothing` has a race window:**

- Files: `apps/api/src/routes/cards.ts` (lines 62–72)
- Why fragile: Insert lemma with `onConflictDoNothing`, then separately `findFirst` the lemma by `headword`. If two concurrent requests insert the same lemma at the same time, the second `findFirst` query should find the existing row — but the query filters only on `headword` (line 68), not on `user_id + headword`. For a single V0 user this is safe, but the `lemmas` unique index is on `(user_id, headword)`. If multi-user is enabled without fixing this, two users with the same word would resolve incorrectly.
- Safe modification: Add `eq(lemmas.user_id, V0_USER_ID)` to the `findFirst` where clause.
- Test coverage: None.

**Audio playback `soundRef` not cleaned up between cards in review session:**

- Files: `apps/mobile/app/review/index.tsx` (lines 41–55, 47–56)
- Why fragile: `soundRef.current?.unloadAsync()` in the cleanup `useEffect` fires only on component unmount. When the user exits mid-session via "× Exit", the sound is unloaded. However, if the `playAudio` function is called while a previous sound is still playing and `unloadAsync` throws (e.g., sound already unloaded), the outer `try/catch` silently swallows the error, potentially leaving dangling sound objects.
- Safe modification: The pattern is acceptable for V0 but worth noting — ensure `unloadAsync` is called before `createAsync` on every card advance (which it currently is via `playAudio`'s first line).
- Test coverage: None.

---

## Scaling Limits

**`/cards/due` returns all due cards with no pagination:**

- Current capacity: Works for personal-driver scale (tens to low hundreds of cards).
- Limit: Returns every due card as a single JSON payload. At 500+ cards due (missed reviews after a break), the payload could be large and the review session UI (which renders card count as a number) would show a daunting queue.
- Scaling path: Add `LIMIT` query parameter to the route. For V0 personal driver, not urgent.

**Local `audio-cache/` directory grows unboundedly:**

- Current capacity: 2 files in cache currently.
- Limit: No eviction policy. Every unique word synthesized adds an MP3 to `audio-cache/`. Disk space is the only bound.
- Scaling path: Migrate to Supabase Storage (ADR 0007). Until then, manual cleanup via `ls audio-cache/` + deletion.

---

## Dependencies at Risk

**`ts-fsrs` is listed in both `apps/api` and `apps/mobile` package.json independently:**

- Risk: Version drift — they currently both pin `^5.3.2` but this is not enforced by `syncpack` rules if someone bumps one without the other.
- Impact: FSRS scheduling on the server and any future client-side scheduling logic could diverge.
- Migration plan: Move `ts-fsrs` to the root workspace or a shared package. Run `syncpack lint` to catch mismatches early.

**`zod` is at `^4.4.3` (Zod v4 beta/RC) across the monorepo:**

- Risk: Zod v4 has breaking API changes from v3 (e.g., `.parse()` error formats, `.safeParse()` `.error` property). The codebase uses `result.error.issues` format (in `llm.ts`) which is a Zod v4 API.
- Impact: If a dependency pulls in Zod v3 transitively, schema imports could collide. Zod v4 itself is a risk if any APIs are still pre-release.
- Migration plan: Confirm Zod v4 stable release status; pin to a specific stable v4 minor if available.

---

## Missing Critical Features

**No error boundary around the review session:**

- Problem: `ReviewScreen` has no React error boundary. An unhandled render error (e.g., `currentCard` shape mismatch from an API schema change) will crash the entire app rather than showing a recoverable error screen.
- Blocks: Graceful degradation on bad API responses.

**No offline or stale-cache handling for due cards:**

- Problem: If the API is unreachable when the user opens the app, `isError` shows a static error message ("Is the API running?") but there is no stale-cache fallback to show previously-loaded cards. `refetchOnWindowFocus: true` will fire network requests on every tab-switch even when the API is known to be down.
- Blocks: Usable experience when API is momentarily unavailable (e.g., API not started yet on dev machine).

**Streak data is entirely static (always `1`):**

- Problem: `streak/index.tsx` hard-codes streak as `1` with a comment "V0: stubbed with static data. Needs review history API at V1." The `StreakChip` always shows `1` with `state: 'inactive'`.
- Blocks: V0 success criterion 3 ("complete 7 consecutive days of reviews without using prior tool") cannot be verified by the user within the app itself.

---

## Test Coverage Gaps

**Zero test files exist in the entire codebase:**

- What's not tested: Every API route, every provider (LLM, TTS, image search), all FSRS scheduling logic, all UI components.
- Files: All of `apps/api/src/`, `apps/mobile/src/`, `packages/db/src/`
- Risk: Any regression in the generate pipeline, card approval, or review submission goes undetected until manual testing. Provider interface contracts are not enforced by tests.
- Priority: High — the `vitest.config.ts` is configured with `passWithNoTests: true`, meaning CI never fails for missing tests.

**No integration test for the card generation → approval pipeline:**

- What's not tested: The end-to-end flow: POST `/generate` → POST `/cards` → GET `/cards/due` → POST `/reviews`. This is the core user journey.
- Files: `apps/api/src/routes/generate.ts`, `apps/api/src/routes/cards.ts`, `apps/api/src/routes/reviews.ts`
- Risk: The sentence card bug (wrong `card_kind`) and missing sentence audio would be caught immediately by an integration test.
- Priority: High.

**No test for LLM output validation (Zod schema boundary):**

- What's not tested: `extractWordFields()` Zod parsing, the `extractJson()` fence-stripping logic, behavior when the LLM returns malformed JSON or a schema mismatch.
- Files: `apps/mobile/src/providers/llm.ts`, `prompts/card-generation/extract-word-fields.ts`
- Risk: LLM prompt changes or model updates could silently start returning invalid schemas with no test catching it.
- Priority: Medium.

---

_Concerns audit: 2026-05-18_
