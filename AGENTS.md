# AGENTS.md

Brazilian Portuguese language learning app. AI tools (Claude Code, Cursor,
Aider, etc.) read this file first. Read it in full before making changes.

---

## Project Snapshot

- **What:** AI-native Fluent Forever-style learning app, Brazilian
  Portuguese first.
- **Stack:** Expo + React Native + React Native Web. Single codebase,
  mobile primary, desktop functional.
- **Backend:** Cloud-first from day 1. Local cache + sync queue on clients.
- **Phase:** V0 — Personal Daily Driver. See `docs/specs/v0.md`.
- **Solo developer:** Light coding background, AI-assisted. Lean process,
  clean code, no premature abstraction.

---

## Read These Next

Always check before touching unfamiliar areas:

1. `README.md` — quick orientation
2. `docs/specs/v0.md` — full V0 scope (this is the working spec)
3. `docs/decisions/` — every non-obvious decision with rationale
4. `docs/glossary.md` — domain terms (lemma, FSRS, i+1, CEFR, etc.)
5. `docs/ideas.md` — captured future ideas, ranked by likelihood of
   shipping. READ for context but DO NOT build from them without an
   explicit ADR being written first. See "Working with docs/ideas.md"
   below for format and conventions.
6. `docs/runbooks/` — how-to guides

If you change an architectural decision, write a new ADR in
`docs/decisions/`. If you introduce a new domain term, add it to the
glossary.

---

## Architecture Rules

Non-negotiable. If a task seems to require violating one, stop and ask.

### Data model
- **Lemmas exist at V0** to prevent duplicate cards across word forms.
  Cards reference `lemma_id`. When creating a card, deduplicate by
  lemma — don't create a second card for the same lemma.
- **One card type at V0**, with a `card_kind` discriminator
  (`'word' | 'sentence'`). Word cards have headword/gender/stress/etc.;
  sentence cards have only sentence + image + audio.
- **All future-use schema fields have inline comments** explaining
  purpose, current usage, and which version activates them.

### Code structure
- **Feature folders** under `apps/mobile/src/features/`. Loose imports
  across features at V0; barrel boundaries enforced at V2.
- **Pure logic in `lib/`, types in `domain/`, I/O in `providers/`.**
  `domain/` never imports from anywhere else.
- **Single source of truth for schema:** Drizzle ORM. Database
  migrations and TypeScript types both derive from it.
- **One concept per file**, named after the concept (`lemma.ts`,
  `card-generation-pipeline.ts` — not `utils.ts`, `helpers.ts`).

### Provider boundaries
- TTS, image search, LLM, and audio storage are accessed only via
  interfaces in `apps/mobile/src/providers/`. Concrete implementations
  are swappable.
- New external service integrations require an ADR before adding a
  provider boundary.

### Error handling
- **Data boundaries use `Result<T, E>`** from `@/domain/result`. UI
  code may throw for ergonomics; AI outputs, network calls, parsing,
  and sync operations always return Result.
- **No silent fallbacks.** If the LLM returns malformed JSON, throw
  or log loudly. Don't quietly use a default.
- **Specific error types**, not generic `Error`. Each provider
  defines its own error union.

### AI usage
- AI is for content unique to the user's state (i+1 sentences,
  card-field generation). Curated content (when added) is never
  AI-generated at runtime.
- **Every LLM output is validated through a Zod schema** before use.
  No untyped LLM JSON in app code.
- **Prompts live in `prompts/` as versioned files**, not inline
  strings. See `prompts/README.md`.

---

## Code Conventions

### TypeScript
- Strict mode + `noUncheckedIndexedAccess`. No `any` unless explicitly
  justified in a comment.
- **Domain types over inline shapes.** Import from `@/domain`, don't
  redefine.
- **Discriminated unions over flag fields.** `type Card = WordCard |
  SentenceCard`, not `Card { kind: string, ... }`.
- **Branded types for IDs** where ambiguity is real.
- **`Result<T, E>`** at every data boundary.

### Naming
- Files match the concept: `lemma.ts`, not `lemma-types.ts`.
- Folders match the domain: `features/cards/`, not `features/c/`.
- Boolean fields prefixed `is_` / `has_` (DB) / `is` / `has` (TS).
- Constants over magic numbers/strings.

### Comments and JSDoc
- Every exported type and function has JSDoc with one-sentence
  purpose. Add params/returns/edge cases when non-obvious.
- Non-trivial functions include an example:
  `/** Example: lemmatize("falando") → "falar" */`.
- Schema "future use" fields explain why they exist now.

### Avoid
- Premature abstraction. A function called twice doesn't need
  extracting.
- Clever patterns. If reading takes more than a few seconds, simplify.
- `any`, `as` casts, `// @ts-ignore`. If you need them, comment why.

---

## Estimation Convention

T-shirt sizing on all issues and milestones:

- **S** — a few hours, single sitting, low complexity
- **M** — a day or two, single concern, requires thought
- **L** — several days, multiple concerns. Break down before scheduling.
- **XL** — substantial, multiple unknowns. Break down before scheduling.
- **XXL+** — grand ideas, brainstorm tier. Captured in `docs/ideas.md`,
  not estimated, not scheduled. Reevaluated when tech/tools change.

L and XL items get decomposed into S/M pieces before work starts.
XXL+ items stay in `docs/ideas.md` until something changes their
tractability — then they get decomposed and moved to active work.

---

## Testing Policy

Test what would hurt to break. Skip the rest.

### Always test
- **Pure logic.** `lib/` and any logic-bearing `domain/` modules.
  FSRS scheduler, validation helpers, Result utilities.
- **Data boundaries.** AI output validation (Zod), DB serialization,
  sync conflict resolution, audio cache lookup/dedupe.
- **Critical user flows, sparingly.** "Generate a card → approve →
  appears in tomorrow's review queue."

### Don't test
- UI component rendering details
- External API responses (mock the provider boundary instead)
- AI-generated content quality (eyeball it)

### Tools
- Vitest for unit tests
- Detox or Maestro (TBD) for flow smoke tests
- Tests in `tests/unit/` mirroring `src/`, plus `tests/flows/`

---

## Working with GitHub

### Issues
- Use `gh issue create` for any bug, feature, or ADR-needed
  encountered outside the current task scope. **Don't silently fix
  unrelated bugs.** File the issue, link it, decide later.
- Issue templates in `.github/ISSUE_TEMPLATE/`. Use them.
- Apply labels: `bug`, `feature`, `chore`, `adr`, plus a phase label
  (`v0`, `v1`, `v2`, `v3+`).
- Apply size label (`size/s`, `size/m`, `size/l`, `size/xl`,
  `size/xxl`).
- Issues auto-populate to the GitHub Project board.

### Branches and commits
- Conventional Commits enforced via commitlint:
  - `feat:` new feature
  - `fix:` bug fix
  - `chore:` tooling, deps, build
  - `docs:` documentation
  - `refactor:` no behavior change
  - `test:` adding tests
- Commit messages explain *why*, not just *what*. Reference issue
  numbers (`fix: handle null IPA in card display (#42)`).
- Branch off `main`, PR back to `main`. Branch protection requires
  CI green.

### PRs
- Use the PR template at `.github/pull_request_template.md`.
- One logical change per PR where possible.
- Self-review before merging.

### Releases
- `release-please` runs on every push to `main`. It opens a release
  PR. Merge that PR to ship a release.
- CHANGELOG.md is auto-generated. Don't edit it manually.

---

## What to Ask About Before Doing

These changes need explicit approval — file an issue with `adr`
label and pause:

- Adding a new external service or provider
- Changing the schema in a way that affects existing data
- Reorganizing folder structure or feature boundaries
- Adding a new dependency (especially anything large or copyleft)
- Changing a non-goal (see `docs/specs/v0.md`)
- Anything that violates an existing ADR
- Building anything from `docs/ideas.md` (these need an ADR first)

---

## Licensing

- **No copyleft.** No GPL, AGPL, LGPL, CC-BY-SA dependencies or data.
  This is intended to be a paid app eventually.
- **Permissive licenses fine** (MIT, Apache 2.0, BSD, CC-BY, public
  domain). Attribution recorded in `data/README.md` for CC-BY data.
- **Proprietary services accepted** where they materially outperform
  open alternatives, but the dependency must be swappable behind
  a provider interface. No vendor lock-in.

When in doubt about a dependency's license, ask before adding.

---

## Working with docs/ideas.md

`docs/ideas.md` is a single file containing all captured future
ideas and brainstorms, ranked by likelihood of shipping. AI tools
must follow these rules when interacting with it:

### Reading
- READ relevant sections for context when working on related code.
- The "Why not yet" section often explains the rationale for a V0
  decision — useful when someone (human or AI) is about to undo it.

### Adding new ideas
Use this exact format. Each idea is a top-level `## ` heading so
the file can be split mechanically into per-idea files later if
needed.

```markdown
## [Idea title]

**Tier:** 1 / 2 / 3 / 4
**Size:** S / M / L / XL / XXL+
**Earliest version:** V1 / V2 / V3+ / unlikely
**Related:** other idea names, ADR numbers

### What
One paragraph: what the feature is.

### Why it might be worth doing
Bullet list of actual user value or competitive angle.

### Why not yet
Bullet list: complexity, dependencies, scope discipline,
"haven't validated need" — the honest reason it's deferred.
```

### Tier assignment

Tier reflects a mix of factors:

1. **Ease of build** — how hard given V0 architecture
2. **Likelihood of completion** — will this realistically ship?
3. **Personal productivity value** — daily founder use
4. **Product-market value** — moat / pitch strength
5. **Architectural readiness** — does V0 already support this?

- **Tier 1** = high on most factors, likely V1 backlog
- **Tier 2** = real differentiators, V2 territory
- **Tier 3** = V3+ candidates, moderate likelihood
- **Tier 4** = XXL brainstorms, unlikely without major change

When unsure, err toward a lower tier. Ideas earn their way up.

### Re-ranking
When new information changes an idea's tractability (new library,
new API, new technique that makes it cheap), move it up. Note the
change in the "Why not yet" section so the rationale trail stays
visible. Don't silently delete or rewrite history — append context.

### Building from ideas
**Don't.** No idea graduates to active work without an ADR being
written first. The ADR captures the actual decision (now we're
building it, here's why now, here's the approach) — the idea
captures the speculation.

When an idea graduates: write the ADR, link to the idea section,
update the idea's "Why not yet" to "Graduated — see ADR-NNNN."
Leave the section in place as historical context.

---

## Glossary Quick-Reference

(Full glossary at `docs/glossary.md`.)

- **Lemma** — dictionary headword. Mastery anchor.
- **Form** — surface form a lemma takes (`falo` is a form of `falar`).
  No forms table at V0.
- **Variant** — regional variety (carioca, paulista, caipira, etc.).
  V0 hardcodes neutral broadcast Brazilian.
- **FSRS** — Free Spaced Repetition Scheduler.
- **i+1** — input one step beyond current ability. Sentences shown to
  the user are i+1 against learned vocabulary.
- **CEFR** — Common European Framework. A1-C2 levels.
- **L1** — user's native language(s).
- **Cognate** — word in another language sharing root with target.

---

Last updated: 2026-05-07
