# AGENTS.md

Brazilian Portuguese language learning app. AI tools (Claude Code, Cursor,
Aider, etc.) read this file first. Read it in full before making changes.

---

## Project Snapshot

- **What:** AI-native Fluent Forever-style learning app, Brazilian Portuguese first.
- **Stack:** Expo SDK 54 + React Native (mobile only). Hono API on Node.js. Drizzle ORM + Supabase Postgres. NativeWind (Tailwind). TanStack Query. FSRS via ts-fsrs. OpenRouter → Gemini for LLM. Narakeet for TTS. Pexels for images.
- **Phase:** V0 — Personal Daily Driver. See `docs/specs/v0.md`.
- **Solo developer:** Light coding background, AI-assisted. Lean process, clean code, no premature abstraction.

---

## Read These Next

Always check before touching unfamiliar areas:

1. `README.md` — quick orientation and dev setup
2. `docs/specs/v0.md` — full V0 scope (working spec)
3. `docs/decisions/` — every non-obvious decision with rationale
4. `docs/glossary.md` — domain terms (lemma, FSRS, i+1, CEFR, etc.)
5. `docs/ideas.md` — future ideas. Read for context; do not build without an ADR.
6. `docs/runbooks/` — how-to guides

If you change an architectural decision, write a new ADR in `docs/decisions/`.
If you introduce a new domain term, add it to the glossary.

---

## Brief Versioning

- Active brief lives at `docs/briefs/v{N}-{topic}.md`.
- When a new version supersedes an old one, move the old to `docs/briefs/_archive/` and add a `Status: archived` header citing the successor and the reason.
- Never delete briefs. They are the design history.
- When asked to implement a brief, always implement the most recent active version. Flag any conflict between active and archived.

---

## Architecture Rules

Non-negotiable. If a task seems to require violating one, stop and ask.

### Data model

- **Lemmas** deduplicate cards across word forms. Cards reference `lemma_id`. Never create a second card for the same lemma.
- **One card type** with a `card_kind` discriminator (`'word' | 'sentence'`).
- **Single source of truth for schema:** Drizzle ORM. DB migrations and TypeScript types both derive from it.

### Code structure

- **`apps/api/src/providers/`** — server-side I/O (LLM, TTS, image search). Currently lives in `apps/mobile/src/providers/` for historical reasons; API imports from there directly. Do not move without updating all imports.
- **One concept per file**, named after the concept (`lemma.ts`, `card-generation-pipeline.ts` — not `utils.ts`, `helpers.ts`).
- **Prompts live in `prompts/`** as versioned files, not inline strings. See `prompts/README.md`.

### Provider boundaries

TTS, image search, LLM, and audio storage are accessed only through the provider files. Concrete implementations are swappable. New external service integrations require an ADR before adding a provider.

### AI usage

- AI is for content unique to the user's state (i+1 sentences, card-field generation). Curated content is never AI-generated at runtime.
- **Every LLM output is validated through a Zod schema** before use. No untyped LLM JSON in app code.

### Error handling

- **No silent fallbacks.** If the LLM returns malformed JSON, throw or log loudly. Don't quietly use a default.
- **Specific error types**, not generic `Error`. Each provider defines its own error union.

---

## Code Conventions

### TypeScript

- Strict mode + `noUncheckedIndexedAccess`. No `any` unless justified in a comment.
- **Discriminated unions over flag fields.**
- Constants over magic numbers/strings.

### Naming

- Files match the concept: `lemma.ts`, not `lemma-types.ts`.
- Boolean fields prefixed `is_` / `has_` (DB) / `is` / `has` (TS).

### Comments

- Default to no comments. Add one only when the WHY is non-obvious.
- Schema "future use" fields explain why they exist now.

### Avoid

- Premature abstraction. A function called twice doesn't need extracting.
- `any`, `as` casts, `// @ts-ignore` without an explanatory comment.

---

## Communication Style

- **Terse by default.** No preamble, no recap, no filler.
- Bullets and tables over prose.
- End every response with one line: `Status: ✅ Done | 🛑 Awaiting input | ⚠️ Partial`
- Inline markers: 🛑 blocking question, ❓ decision needed, ⚠️ warning.
- Verbose only for: plans awaiting approval, ADRs, debugging sessions.

---

## Estimation Convention

T-shirt sizing on all issues and milestones:

- **S** — a few hours, single sitting
- **M** — a day or two, single concern
- **L** — several days, multiple concerns. Break down before scheduling.
- **XL** — multiple unknowns. Break down before scheduling.
- **XXL+** — grand ideas. Lives in `docs/ideas.md`, not estimated.

L/XL items get decomposed into S/M pieces before work starts.

---

## Testing Policy

Test what would hurt to break. Skip the rest.

### Always test

- Pure logic in `lib/` and logic-bearing domain modules.
- Data boundaries: AI output validation (Zod), DB serialization, audio cache lookup/dedupe.
- Critical user flows, sparingly: "Generate a card → approve → appears in review queue."

### Don't test

- UI component rendering details
- External API responses (mock the provider boundary)
- AI-generated content quality

### Tools

- Vitest for unit tests
- Tests in `tests/unit/` mirroring `src/`, plus `tests/flows/`

---

## Working with GitHub

### Issues

- Use `gh issue create` for any bug, feature, or ADR-needed encountered outside the current task. **Don't silently fix unrelated bugs.** File the issue, link it, decide later.
- Labels: `bug`, `feature`, `chore`, `adr`, phase (`v0`, `v1`, `v2`), size (`size/s` … `size/xxl`).

### Branches and commits

- Conventional Commits via commitlint: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Commit messages explain _why_, not just _what_.
- Branch off `main`, PR back to `main`.

### Releases

- `release-please` runs on every push to `main`. Merge its PR to ship. Don't edit `CHANGELOG.md` manually.

---

## What to Ask About Before Doing

File an issue with `adr` label and pause for:

- Adding a new external service or provider
- Schema changes that affect existing data
- Reorganizing folder structure or feature boundaries
- Adding a new dependency (especially large or copyleft)
- Changing a non-goal (see `docs/specs/v0.md`)
- Anything that violates an existing ADR
- Building anything from `docs/ideas.md`

---

## Licensing

- **No copyleft.** No GPL, AGPL, LGPL, CC-BY-SA.
- **Permissive licenses fine** (MIT, Apache 2.0, BSD, CC-BY, public domain).
- **Proprietary services accepted** where they outperform alternatives, but must be swappable behind a provider interface.

---

## Working with docs/ideas.md

`docs/ideas.md` contains all captured future ideas, ranked by likelihood of shipping.

### Adding new ideas

```markdown
## [Idea title]

**Tier:** 1 / 2 / 3 / 4
**Size:** S / M / L / XL / XXL+
**Earliest version:** V1 / V2 / V3+ / unlikely
**Related:** other idea names, ADR numbers

### What

### Why it might be worth doing

### Why not yet
```

**Tiers:** 1 = likely V1 backlog · 2 = real differentiators, V2 · 3 = V3+ candidates · 4 = unlikely without major change.

### Building from ideas

**Don't.** No idea graduates to active work without an ADR first. When an idea graduates: write the ADR, link to the idea, update "Why not yet" to "Graduated — see ADR-NNNN."

---

## Glossary Quick-Reference

(Full glossary at `docs/glossary.md`.)

- **Lemma** — dictionary headword. Mastery anchor.
- **Form** — surface form a lemma takes (`falo` is a form of `falar`).
- **FSRS** — Free Spaced Repetition Scheduler.
- **i+1** — input one step beyond current ability.
- **CEFR** — Common European Framework. A1-C2 levels.
- **L1** — user's native language(s).
- **Cognate** — word sharing root with a target-language word.

---

Last updated: 2026-05-16
