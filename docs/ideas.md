# Ideas

Captured brainstorms, deferred features, future directions. Read for
context, do not auto-implement.

---

## How to use this file

**Reading:** Anyone working on related code should read the relevant
idea section for context. AI tools especially — these capture
rationale that would otherwise be lost.

**Building from this file:** Anything here moves to active work only
after an ADR is written. Don't take "earliest version: V1" as
permission to start — it's a placeholder estimate, not a green light.

**Adding ideas:** Use the format below. Slot the idea into the right
tier based on the ranking factors below. If you're unsure, err
toward a lower tier; ideas earn their way up.

**Re-ranking:** When new information changes an idea's tractability
(new library, new API, new technique that makes it cheap), move it
up. Note the change in the "Why not yet" section so the rationale
trail is visible.

**Splitting back into files:** Each idea is a top-level `##` heading
with a strict template. To split into individual files later, a
script can match `## ` headers and write one file per section.
This is a mechanical ~30-minute task with any AI tool when the time
comes.

---

## Format for each idea

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

---

## Ranking factors

Ideas are ranked by a mix of:

1. **Ease of build** — how hard given V0 architecture
2. **Likelihood of completion** — will this realistically ship?
3. **Personal productivity value** — how much the founder uses it daily
4. **Product-market value** — moat / pitch strength for public product
5. **Architectural readiness** — does V0 already support this?

Top of list = high on most factors. Bottom = brainstorms unlikely
to graduate without major change.

---

# Tier 1 — Likely V1 backlog, real value, low risk

## Hover translation reveal

**Tier:** 1
**Size:** S
**Earliest version:** V1
**Related:** ADR for V0 spec Principle #5

### What
Tap or hover any card to reveal the English gloss. Default off.
Setting toggle in settings.

### Why it might be worth doing
- Sometimes the user genuinely doesn't recognize a word; an "I'm
  stuck" escape hatch reduces frustration.
- Cards already store `sentence_gloss_en` (hidden); the data is
  there.
- Almost zero engineering cost — UI toggle plus reveal interaction.

### Why not yet
- Settings UI doesn't exist at V0.
- Conflicts slightly with Principle #5 (no translation crutch); UX
  has to keep it as an explicit gesture, not a default.

---

## Streak tracking

**Tier:** 1
**Size:** S
**Earliest version:** V1
**Related:** V0 spec non-goals (gamification deferred; streaks kept
as informational habit support)

### What
Track consecutive days of review activity. Show streak count to
user. Informational only — not gamification.

### Why it might be worth doing
- SRS algorithms degrade if days are skipped, so streaks reinforce
  actually valuable behavior.
- Gentle motivational nudge without becoming an XP economy.
- Daily-driver feature for the founder.

### Why not yet
- V0 founder doesn't need a counter to remember to use the app yet.
- One more screen to design.

---

## Multi-deck support

**Tier:** 1
**Size:** S–M
**Earliest version:** V1
**Related:** none

### What
Users can create multiple decks (e.g., "Brazilian Portuguese",
"Travel", "Cooking vocab"). Cards belong to one deck. Reviews
scope to a deck or combine across decks.

### Why it might be worth doing
- Lets users separate concerns (work vs. casual vocab).
- Standard expectation from Anki/SuperMemo users.
- Trivial schema add (single `deck_id` FK on cards).

### Why not yet
- V0 has one user, one purpose.
- No real value until users have hundreds of cards.

---

## Onboarding flow

**Tier:** 1
**Size:** M
**Earliest version:** V1
**Related:** none

### What
First-run experience: pronunciation diagnostic, dialect selection,
formality default, first 25 cards generated automatically.

### Why it might be worth doing
- Required for non-founder users.
- Sets expectations and demonstrates value in first 5 minutes.
- Blocks public release entirely.

### Why not yet
- V0 is the founder's daily driver — no onboarding needed.
- Designing this before knowing what the daily-driver experience
  feels like = guess work.

---

## Multiple card styles

**Tier:** 1
**Size:** M
**Earliest version:** V1
**Related:** Anki interop

### What
Beyond V0's single template, support audio-first, image-only, cloze
deletion, recognition, and production card styles. User configures
the mix per deck.

### Why it might be worth doing
- Different styles drill different skills.
- Anki feature parity for power users.
- Cloze in particular is essential for sentence-level grammar
  drilling.

### Why not yet
- V0 ships one style to validate the loop first.
- Note-type schema flexibility (Anki-style) is a meaningful
  addition.

---

## Phase 0 cognate calibration

**Tier:** 1
**Size:** M
**Earliest version:** V1
**Related:** false-friend warnings, full cognate engine

### What
At onboarding, ask the user what other languages they know. For
each known L1 with strong cognate density (Spanish, Italian,
French, English), pre-mark a starter set of high-confidence
cognates as "already familiar" — they go into review queue at
lower priority and surface as flavor in early sentences.

### Why it might be worth doing
- Spanish/Italian/French speakers are massively under-served by
  apps that treat all learners as blank slates.
- Strong differentiator for romance-language speakers.
- Even English speakers have ~800–1000 Latinate cognates.

### Why not yet
- V0 founder has known L1; no calibration needed.
- Requires per-L1 cognate CSV data (curated or LLM-generated).
- Onboarding doesn't exist at V0.

---

## False-friend warnings

**Tier:** 1
**Size:** M
**Earliest version:** V1
**Related:** Phase 0 cognate calibration

### What
When the user encounters a Portuguese word with a known false
friend in their L1 (e.g., *embaraçada* ≠ Spanish *embarazada*),
surface a warning before they cement the wrong meaning.

### Why it might be worth doing
- Users coming from Spanish, English, Italian, or Japanese all
  hit predictable false friends.
- Almost no apps do this well.
- Real differentiator at modest cost.

### Why not yet
- Requires a cognate-pairs schema slot populated with curated
  false-friend data per L1 pair.
- V0 founder may benefit from this but not at V0 priority.

---

## Anki CSV import / export

**Tier:** 1
**Size:** S (CSV) / L (full .apkg)
**Earliest version:** V1 (CSV), V2 (full .apkg)
**Related:** none

### What
Export cards to Anki-compatible CSV (V1) or full `.apkg` (V2).
Import the same.

### Why it might be worth doing
- Protects user data from lock-in.
- Lowers switching cost both ways.
- Real signal of trust to power users.

### Why not yet
- V0 user (the founder) isn't migrating anywhere.
- CSV is straightforward; .apkg is a real implementation project
  (SQLite-based, well-documented but non-trivial).

---

# Tier 2 — V2 territory, real differentiators

## Forms and senses tables

**Tier:** 2
**Size:** M each
**Earliest version:** V1 (forms), V2 (senses)
**Related:** tap-on-word, sentence mining, lemma model

### What
Add `forms` table (surface forms of lemmas — *falo*, *falas*,
*falando* all roll up to *falar*) and `senses` table (polysemy —
*banco* bank vs *banco* bench).

### Why it might be worth doing
- Forms enable lemmatizing user input and tap-on-word lookups.
- Senses enable proper polysemy handling without ambiguity.
- Schema rigor improves over time as features need this.

### Why not yet
- V0 cuts these tables because the simple lemma-only model handles
  card dedup adequately.
- Adding them requires backfilling existing cards (manageable at
  low card counts; harder later).

---

## "Common gringo mistakes" word list

**Tier:** 2
**Size:** M
**Earliest version:** V1
**Related:** word_lists framework

### What
Curated CSV of words English-speaking learners systematically get
wrong in Brazilian Portuguese. Available as opt-in word list
alongside the frequency list.

### Why it might be worth doing
- High personal value for the founder (English L1).
- Easy first content product on top of word_lists framework.
- Could become a marketing hook for English-speaking learners.

### Why not yet
- word_lists framework not built at V0 (the V0 frequency list is
  just a CSV consumed at ingestion time).
- Curation work needed.

---

## Grammar progression

**Tier:** 2
**Size:** M (rule library) / L (CEFR scaffolding) / XXL+ (full system)
**Earliest version:** V1 (small) or V2 (substantial)
**Related:** Michel Thomas mode

### What
Some way of teaching grammar that emerges from sentences encountered
during review, with a curated rule library the user can tap into.
Possible approaches: CEFR-scaffolded progression, on-demand rule
lookup, or others not yet considered.

### Why it might be worth doing
- Most learners stall at "I know words but can't form sentences."
- FF method de-emphasizes grammar in early phases but most learners
  hit a wall at A2/B1 without it.
- Pre-made Anki decks are bad at this; real wedge.

### Why not yet
- Implementation approach is genuinely unclear and has high variance
  in cost.
- V0 needs to validate the simpler vocab loop first.
- Grammar adds significant content authoring burden — rules need
  curation, not AI generation.

---

## Tap-on-word lookup in sentence cards

**Tier:** 2
**Size:** L
**Earliest version:** V2 or V3
**Related:** forms table, sentence mining

### What
When viewing a sentence card, tapping any word reveals quick info
(gloss, gender, register tag, usage context). The word's lemma is
identified and the relevant data surfaced.

### Why it might be worth doing
- Sentence cards become a richer reading experience.
- This is the *defining* feature in apps like LingQ, Migaku, Lute.
- Real wedge for consuming authentic content.

### Why not yet
- Requires lemmatizing every sentence to map words → lemmas.
- That requires the `forms` table (V0 cut) or runtime
  lemmatization (slower, pricier per review).
- Validating the simpler V0 loop first is the right call.

---

## Subtitle/video card generation

**Tier:** 2
**Size:** L–XL
**Earliest version:** V2
**Related:** sentence mining

### What
On desktop, user uploads a video file with subtitles (or links one).
System parses subtitles, identifies unknown vocabulary, generates
cards using audio extracted from the video and a screenshot from
the video as the image. Memorable, contextual cards.

### Why it might be worth doing
- Video clips and screenshots are vastly more memorable than stock
  images.
- A real "FF on steroids" feature.
- Founder explicitly wanted this.
- Desktop browser is the natural surface (file uploads, video
  parsing).

### Why not yet
- Substantial implementation work (subtitle parsing, video
  processing, audio extraction).
- Requires lemmatization pipeline (forms table).

---

## Sentence mining from external content

**Tier:** 2
**Size:** L
**Earliest version:** V2
**Related:** subtitle/video, forms table

### What
User pastes a URL or text. System extracts unknown vocabulary and
queues cards for those words. Useful for processing news articles,
blog posts, etc.

### Why it might be worth doing
- Bridges the gap between learning and consuming real content.
- Common workflow in advanced language learning.

### Why not yet
- Requires lemmatization of arbitrary text.
- Requires forms table or runtime lemmatization (spaCy/Stanza).
- V0's "user types a word" handles the simple case.

---

## TTS provider/voice switching UI

**Tier:** 2
**Size:** M (constrained) / L–XL (unbounded — avoid)
**Earliest version:** V2
**Related:** ADR 0004, ADR 0005

### What
Interface for the user to pick from multiple TTS providers and
voices. Architecture already supports this (audio_clips dedupe by
content_hash that includes provider + voice).

### Why it might be worth doing
- Voice preferences are personal — different learners prefer
  different voices.
- Side-by-side A/B testing during development is genuinely useful.
- Future: "regenerate this card's audio with a different voice"
  button.

### Why not yet
- V0 founder is happy with one Narakeet voice.
- Voice catalogs are massive — easy to over-design.

### Two scopes (decide before building)

**Constrained — easy version, ~3-5 days:**
- Hand-pick 3-5 voices total
- One global default in settings
- "Regenerate audio with different provider" button per card

**Unbounded — feature creep, 2-3 weeks:**
- Browse the full Narakeet catalog (hundreds of voices)
- Preview voices, per-card overrides, favorites, search,
  categories, cost tracking, quality scoring

When this gets built, pick the constrained version intentionally.

---

## Native recording library

**Tier:** 2
**Size:** M (Forvo) / L (curated)
**Earliest version:** V2
**Related:** ADR 0004

### What
Curated or commissioned audio recordings from native BR Portuguese
speakers, layered on top of TTS as a quality upgrade for the most
common words/phrases.

### Why it might be worth doing
- TTS is good but not native.
- For top ~500–2000 words, a small recorded library is high-leverage.
- Forvo API offers crowd-sourced recordings.

### Why not yet
- V0 TTS quality (Narakeet) is good enough to validate the method.
- Curation/commissioning is a real content project.
- Forvo coverage is inconsistent.

---

# Tier 3 — V3+ candidates, moderate likelihood

## Mini pronunciation notes for tricky sounds

**Tier:** 3
**Size:** S–M
**Earliest version:** V2
**Related:** IPA module

### What
One-sentence pronunciation hint per card when the word contains a
phoneme tricky for the user's L1. Example: "the *r* in this word
is an English *h* sound."

### Why it might be worth doing
- Real teaching value when learners are repeatedly mispronouncing.
- AI can flag and write these.

### Why not yet
- Quality control: AI-generated pronunciation guidance must be QA'd.
- One more card field to design and render.
- V0 cards prioritize audio-led pronunciation.

---

## IPA / phonetics module

**Tier:** 3
**Size:** L
**Earliest version:** V2
**Related:** mini pronunciation notes

### What
Dedicated phonetics learning module: IPA chart with native audio
per phoneme, minimal pairs trainer (avó/avô, sé/se, pau/pão),
spelling-to-sound mapping, IPA recognition drills.

### Why it might be worth doing
- Adult learners fossilize bad pronunciation in early weeks.
- BR Portuguese has phonemes (open/closed e/o, nasal vowels,
  palatalized t/d) that L1 doesn't always have.
- Classic Fluent Forever Phase 1.

### Why not yet
- V0 cards drop IPA entirely — pronunciation learned from audio.
- Standalone phonetics module is a real feature investment.
- Better to validate the basic loop first.

---

## Multi-variant content (carioca, caipira, etc.)

**Tier:** 3
**Size:** L
**Earliest version:** V3+
**Related:** native recording library

### What
Beyond V0's neutral broadcast Brazilian, support tagged content
for specific regional variants: carioca (Rio), paulista (São
Paulo), caipira (interior including Mato Grosso do Sul),
florianopolitano (Santa Catarina coastal), gaúcho (RS),
nordestino (NE).

### Why it might be worth doing
- Founder personally interested in caipira and florianopolitano
  accents (contacts in MS and SC).
- Variant-specific TTS voices and example sentences become possible.
- Differentiator.

### Why not yet
- V0 hardcodes neutral broadcast for simplicity.
- Variant-tagged content is a content-curation project.
- Schema would need expansion (variants table reintroduced).

---

## Audio variants — multiple speakers/speeds

**Tier:** 3
**Size:** M
**Earliest version:** V2 or V3
**Related:** native recording library, multi-variant content

### What
Same card, multiple audio recordings: different speakers, different
speeds, different variants. Same content_hash design supports it.

### Why it might be worth doing
- Robustness: knowing the word, not just one speaker's rendition.
- Variant exposure: hear caipira and florianopolitano versions.

### Why not yet
- V0 single voice is enough to learn from.
- TTS cost scales with variants.
- Better with curated native recordings.

---

## Multi-language target (Spanish, French)

**Tier:** 3
**Size:** XL (first add) / L (subsequent)
**Earliest version:** V3+
**Related:** none

### What
Support learning languages other than Brazilian Portuguese.
Spanish and French are natural next steps — same Romance family,
similar audio pipeline, similar schema needs.

### Why it might be worth doing
- Method is general; works for any language with rich audio
  support.
- Larger addressable market.

### Why not yet
- V0 must validate on one language first.
- Schema currently hardcodes pt-BR throughout.
- Adding a language = adding frequency list, voice selection,
  language-specific prompt tweaks, dialect choices.

---

# Tier 4 — XXL brainstorms, unlikely without major change

## Speech output / pronunciation scoring

**Tier:** 4
**Size:** XL+
**Earliest version:** V3+, feasibility TBD
**Related:** IPA module

### What
User speaks into the mic; system grades pronunciation via Whisper
(open-source ASR) or pitch/formant comparison against native
reference.

### Why it might be worth doing
- Output practice is the gap most apps miss.
- Pronunciation feedback closes the FF method loop.

### Why not yet
- No good middle ground between "skip entirely" and "research-grade
  work" (Whisper fine-tuned on PT phoneme-level).
- Pitch/formant comparison is non-trivial signal processing.
- Validate on real users that this is the missing piece before
  committing.

---

## Michel Thomas-style cumulative grammar mode

**Tier:** 4
**Size:** XXL+
**Earliest version:** V3+
**Related:** grammar progression

### What
Guided lesson mode that introduces grammar transformations
cumulatively: "English -tion → Portuguese -ção. You just learned
200 words." Each lesson builds on the previous, with sentences that
grow in length and complexity within a session.

### Why it might be worth doing
- Michel Thomas's method genuinely works for grammar acquisition.
- No app combines FF's pronunciation/SRS rigor with MT's grammar
  scaffolding.
- Real differentiator.

### Why not yet
- Substantial curriculum design project (not just engineering).
- Requires curated lesson sequencing.
- Comes after the basic vocab loop is proven and grammar-rule
  library exists.

---

## Cognate engine (full version)

**Tier:** 4
**Size:** XXL+
**Earliest version:** V3+
**Related:** Phase 0 calibration, false-friend warnings

### What
Comprehensive cognate-pairs table with similarity scores, sound
correspondence rules, mnemonic hints, historical notes. Powers
cognate-weighted sentence generation.

### Why it might be worth doing
- Genuine differentiator for romance-language speakers and English
  speakers.
- Hard for competitors to replicate (data work, not engineering).
- Could power Japanese-Portuguese flavor (Portuguese loanwords in
  Japanese: pão→パン, etc.) for the founder's interest.

### Why not yet
- Massive content authoring project.
- The simple version (Phase 0 calibration via flat CSV per L1 plus
  curated false-friend list) captures 80% of value at 10% of cost.

---

## Gamification layer

**Tier:** 4
**Size:** XXL+
**Earliest version:** V3+
**Related:** async social presence

### What
Optional toggle layer with hearts, achievements, XP, badges.
Default behavior, scope, and integration are explicit future
design decisions — not pre-decided now.

### Why it might be worth doing
- Some learners genuinely respond to game mechanics.
- Could be a marketing hook for casual learners.

### Why not yet
- V0 explicitly not gamified per principle.
- Design is genuinely open: opt-in vs opt-out, what's included,
  how it integrates.

---

## Asynchronous social presence

**Tier:** 4
**Size:** XXL+
**Earliest version:** V3+
**Related:** gamification layer

### What
Friend lists, friend leaderboards, shared streaks, co-op goals.
All interactions are pre-configured actions — no messaging, no
comments, no posts, no follows-as-feed. Permanent constraint:
this is never a communication platform.

### Why it might be worth doing
- Duolingo-style friend leaderboards genuinely motivate some users.
- Adds social motivation without the moderation burden of a real
  social network.

### Why not yet
- V0 has one user.
- Real product features require auth, friend-graph data, presence
  updates.
- Comes after a real user base exists.
