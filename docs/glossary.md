# Glossary

Domain terms used in this project. Add to this file when introducing
new terminology.

---

**A1, A2, B1, B2, C1, C2** — see CEFR.

**ADR (Architecture Decision Record)** — markdown file in
`docs/decisions/` capturing a significant decision: context, decision,
alternatives considered, consequences. Numbered and dated.

**AGENTS.md** — file at repo root that AI coding tools read first.
Project conventions, architecture rules, quick reference.

**Card** — the reviewable unit. At V0, cards have `card_kind`
discriminator: `'word'` or `'sentence'`.

**CEFR (Common European Framework of Reference)** — six-level scale
(A1, A2, B1, B2, C1, C2) describing language proficiency. A1 ≈
beginner, C2 ≈ near-native.

**Cognate** — word in another language sharing a root or borrowing
with the target word. *Português* / *Portuguese*. Cognates are
leverage for learners who know related languages.

**Conventional Commits** — commit message format
(`feat:`, `fix:`, `chore:`, etc.) that powers automated changelog and
versioning. Enforced via commitlint.

**EAS (Expo Application Services)** — Expo's cloud build service.
Used at V2 to produce native iOS and Android binaries for App Store /
Play Store submission.

**False friend** — a word that looks like a cognate but means
something different. Spanish *embarazada* (pregnant) vs Portuguese
*embaraçada* (embarrassed).

**Form** — a surface form of a lemma. *falo*, *falas*, *falando* are
forms of the lemma *falar*. No forms table at V0.

**FSRS (Free Spaced Repetition Scheduler)** — modern open-source SRS
algorithm based on a three-component memory model (stability,
difficulty, retrievability). Adopted from Anki.

**i+1** — Krashen's term for input one step beyond current ability.
Sentences shown to the user are i+1: built from words they already
know plus exactly one new target.

**IPA (International Phonetic Alphabet)** — standardized phonetic
notation. Not used at V0 cards. May return as a phonetics module in a
later version.

**L1** — user's native language(s). A user can have multiple L1s.

**Lemma** — dictionary headword. The unit at which mastery is
tracked. *falar* is a lemma; *falo*, *falas*, *falava* are forms of
it. At V0, every card is anchored to a lemma to prevent duplicate
cards across word forms.

**PWA (Progressive Web App)** — web app installable to home screen,
runs full-screen. The web client target alongside the React Native
app.

**Register** — the social/contextual flavor of a word: formal,
neutral, informal, slang, vulgar. Tagged on V0 word cards.

**Sense** — a specific meaning of a lemma. *banco* (bank) and
*banco* (bench) are senses of the same lemma. No senses table at V0;
polysemy handled by creating separate cards as needed.

**SRS (Spaced Repetition System)** — algorithm that schedules review
based on memory decay. This app uses FSRS.

**Stress marker** — visual indicator of which syllable carries
primary stress in a word. AI-populated on V0 word cards.

**Surface form** — see Form.

**TTS (Text-to-Speech)** — generating speech audio from text. V0:
Narakeet, accessed through the swappable TTS provider boundary.

**tu / você** — second-person pronouns in Portuguese. *Você*
dominates in Brazil, *tu* in some southern and northeastern regions.
V0 hardcodes *você* + 3rd-person singular conjugation.

**Usage context** — short phrase or list of phrases describing where
or when a word is typically used. AI-populated on V0 word cards.
Example: *feijoada* → "restaurante, almoço".

**Variant** — regional or stylistic variety of a language.
Architecturally, variant is a property of content, not a code branch.
V0 hardcodes neutral broadcast Brazilian Portuguese.

**V0 / V1 / V2 / V3+** — version phases. V0 = personal daily driver,
V1 = polished personal tool with testers, V2 = public App Store
launch, V3+ = differentiation and expansion.
