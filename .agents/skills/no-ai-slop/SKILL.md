---
name: no-ai-slop
description: >-
  Remove AI writing tells and tighten prose. Use for chat replies, docs,
  README, PR/commit messages, UI/marketing copy; when the user asks to
  humanize, de-slop, clean writing, or avoid AI tone. Always-on core also
  lives in AGENTS.md (all agents) and .cursor/rules/no-ai-slop.mdc (Cursor).
---

# No AI Slop

Rewrite prose so it sounds human: direct, specific, varied rhythm. Inspired by
[blader/humanizer](https://github.com/blader/humanizer) and
[hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop).

## Everywhere

| Layer | Role |
|-------|------|
| `AGENTS.md` → Behavioral guidelines | Always-on for Cursor, Codex, Copilot, Gemini, Claude |
| `.cursor/rules/no-ai-slop.mdc` | Cursor `alwaysApply` mirror (keep in sync with AGENTS.md) |
| This skill | Full process + phrase/structure lists for deep rewrites |

Edit the always-on bullets in `AGENTS.md` first, then mirror into the Cursor rule.
Edit this skill for process depth (`phrases.md`, `structures.md`, `patterns.md`).

## When to apply

- User asks to humanize / de-slop / clean writing
- Drafting or editing docs, README, ADRs, PR bodies, commit messages, UI copy
- Chat answers that drift into chatbot tone

**Do not** inject personality into code, legal/compliance text, or dry technical
reference. Neutral and plain is correct there. Still strip filler and AI vocab.

## Process

1. **Scan** for patterns in Core rules + [phrases.md](phrases.md) + [structures.md](structures.md).
2. **Draft rewrite** — same coverage/meaning, natural speech, varied sentence length.
3. **Audit** — ask: "What still sounds obviously AI?" List remaining tells in bullets.
4. **Final rewrite** — fix those tells. Prefer specifics over polish.

If the user gives a writing sample, match their rhythm and word choices instead
of a generic "clean" voice.

### Output (when humanizing pasted text)

1. Final rewrite (default deliverable)
2. Optional: brief change summary
3. Full draft → audit → final only if the user asks for the process trail

For normal agent replies, just write cleanly. Do not narrate the checklist.

## Core rules

1. **Lead with the point.** No throat-clearing ("Here's the thing", "Let's dive in").
2. **Cut filler.** Kill empty adverbs and emphasis crutches. See [phrases.md](phrases.md).
3. **Break formulas.** No "not X, it's Y", staccato drama stacks, binary reveals.
   See [structures.md](structures.md).
4. **Be specific.** Name the thing. Vague declaratives ("The implications are
   significant") die or become concrete.
5. **Prefer active voice.** Name the actor when it helps. Avoid false agency
   ("the decision emerges").
6. **Vary rhythm.** Mix short and long. Prefer two items over the rule of three.
7. **Trust the reader.** No hand-holding, sycophancy, or chatbot closers
   ("Hope this helps!", "Let me know if...").
8. **Formatting hygiene**
   - No em dashes or en dashes — use commas, periods, colons, or parentheses
   - Bold sparingly (never whole sentences)
   - No emoji decoration in prose
   - Sentence-case headings, not Title Case
   - Straight quotes in code/docs unless the source requires curly
   - No § in user-facing text

## High-frequency AI vocabulary (prefer plain)

`additionally`, `delve`, `crucial`, `pivotal`, `landscape` (abstract),
`testament`, `showcase`/`showcasing`, `underscore`/`highlight` (as filler verbs),
`vibrant`, `nestled`, `tapestry`, `foster`/`fostering`, `leverage` (as filler),
`robust`, `seamless`, `cutting-edge`, `game-changer`, `deep dive`, `unpack`

Prefer: `also`, `is`/`has`, concrete nouns, named sources.

## Copula avoidance

Replace inflated copulas:

| Avoid | Prefer |
|-------|--------|
| serves as / stands as | is |
| boasts / features | has |
| plays a crucial role in | does X / is used for |

## Scoring (optional QA)

Rate 1–10 each. Below **35/50**, revise.

| Dimension | Question |
|-----------|----------|
| Directness | Statements or announcements? |
| Rhythm | Varied or metronomic? |
| Trust | Respects reader intelligence? |
| Authenticity | Sounds human? |
| Density | Anything cuttable? |

## False positives (do not over-edit)

Clusters of tells matter more than one hit. Preserve:

- Specific, hard-to-fake detail
- Mixed feelings / unresolved tension
- Natural sentence-length variety
- Legitimate technical vocabulary
- Quoted text, titles, proper names

One em dash or one "however" is not proof of AI.

## Quick before/after

**Before:** Nestled in a vibrant landscape, this release serves as a pivotal
testament to our commitment, showcasing seamless, robust workflows — not just
features, but a game-changer.

**After:** This release adds org-scoped webhooks and retries. Teams can subscribe
to property events without polling.

More patterns: [patterns.md](patterns.md).
