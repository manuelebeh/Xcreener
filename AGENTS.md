# SnapGlow — Agent instructions

Privacy-first screenshot app: capture, beautify, share. Local-first; optional cloud links. Monorepo: pnpm + Turborepo + mise (Node, Rust).

This file is the shared agent guide ([agents.md](https://agents.md/) / AAIF). Tool bridges stay thin; do not copy rules into them.

## Setup commands

```bash
mise trust
mise install
mise run install          # pnpm install
mise run install-hooks
mise run tokens:build     # before first dev if tokens dist missing

mise run dev:desktop      # Tauri
mise run dev:web          # TanStack Start landing (port 3000)
mise run dev:mobile       # Expo
mise run dev:api          # Fastify + Postgres + Redis + MinIO

mise run lint && mise run typecheck && mise run test
```

Use `pnpm` only (not `npm` / `yarn`). Prefer root [`mise.toml`](mise.toml) tasks. Add new apps as `dev:*` mise tasks, not ad-hoc root scripts.

## Repository map

| Path | Role |
|------|------|
| `apps/desktop` | Tauri 2 + React menu-bar app (`modules/` + IPC) |
| `apps/web` | TanStack Start landing + public share viewer (`/s/:token`) |
| `apps/mobile` | Expo SDK 56 + React Native |
| `apps/api` | Fastify cloud API (shares, Auth0, teams) |
| `apps/vscode-extension` | VS Code capture + beautify plugin |
| `apps/figma-plugin` | Figma import/export frames |
| `apps/notion-embed` | Notion OAuth + embeds |
| `packages/design-tokens` | DTCG tokens → CSS / native |
| `packages/ui` / `ui-native` | Shared React / RN components |
| `packages/*-core` | Shared domain libraries (editor, redaction, cloud, …) |
| `packages/sdk` | Official REST API client |
| `docs/` | Product and technical specs (incl. ADRs / sprint history) |

Path-scoped rules (Cursor): `.cursor/rules/` (architecture + workflow). Claude Code mirrors: `.claude/rules/`. Always-on behavior (Karpathy, no-ai-slop): this file + Cursor `.cursor/rules/` mirrors.

## Skills

Skills live in **`.agents/skills/`** ([Agent Skills](https://agentskills.io/)). Edit only there. Cursor/Claude bridges are symlinks, not copies.

| Tool | Discovery |
|------|-----------|
| **GPT / Codex** | `.agents/skills/` (from repo root) |
| **Gemini CLI** | `.agents/skills/` (prefer over `.gemini/skills/`) |
| **GitHub Copilot** | `.agents/skills/` (also accepts `.claude/skills/` / `.github/skills/`; we keep one copy under `.agents`). Extra: `.github/copilot-instructions.md` |
| **Cursor** | `.cursor/skills/` → `.agents/skills/` |
| **Claude Code** | `.claude/skills/` → `.agents/skills/` |

Marketing context: `.agents/product-marketing.md`.

If a skill matches the task, read its `SKILL.md` before improvising. For UI work, read root [`design.md`](design.md) first (locked visual system).

First-party behavioral skills (always relevant; deep detail on demand):

- [`karpathy-guidelines`](.agents/skills/karpathy-guidelines/) — from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills)
- [`no-ai-slop`](.agents/skills/no-ai-slop/) — full rewrite process; always-on core is below

Pinned third-party skills (`skills-lock.json`): [marketingskills](https://github.com/coreyhaines31/marketingskills), [taste-skill](https://github.com/Leonxlnx/taste-skill), [impeccable](https://github.com/pbakaus/impeccable). Update with `npx skills update`.

### CodeGraph

Indexed graph in `.codegraph/`. Prefer `codegraph_explore` / `codegraph explore` over grep when finding or tracing code (TS and Rust). MCP: `.cursor/mcp.json` and `.mcp.json`. After big structural changes: `codegraph sync` (or `codegraph init` on a fresh clone).

## Behavioral guidelines

Always-on for every agent that reads this file (Cursor, Codex, Copilot, Gemini, Claude). Cursor also mirrors them under `.cursor/rules/` (`alwaysApply`). Keep those files in sync when you change this section.

### Karpathy (coding behavior)

Derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876); packaged as [andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). Bias: caution over speed; for trivial tasks, use judgment.

1. **Think before coding** — State assumptions; present interpretations instead of picking silently; push back on overkill; stop and ask when confused.
2. **Simplicity first** — Minimum code that solves the ask. No speculative features, single-use abstractions, or error handling for impossible cases. If 200 lines could be 50, rewrite.
3. **Surgical changes** — Touch only what the request requires. Do not drive-by refactor. Clean up only orphans your change created.
4. **Goal-driven execution** — Turn work into verifiable goals (tests that fail then pass). Multi-step: `step → verify` plan, then loop until checks pass.

### No AI slop (prose and chat)

Write like a clear human. Direct, specific, varied rhythm. For deep rewrites, use the `no-ai-slop` skill.

- Lead with the answer. No throat-clearing ("Here's the thing", "Let's dive in").
- Prefer plain words over AI vocab: delve, pivotal, landscape, testament, showcase, seamless, robust, leverage, game-changer, deep dive.
- Prefer `is` / `has` over "serves as" / "boasts" / "stands as".
- No "not X, it's Y" contrasts. State Y.
- No em/en dashes. Use commas, periods, colons, or parentheses.
- Bold sparingly. No emoji decoration in prose. Sentence-case headings.
- No chatbot closers ("Hope this helps!", "Let me know if…", "Great question!").
- Name actors. Avoid false agency ("the decision emerges").
- Code, diffs, legal/compliance: stay neutral; still cut filler. Quoted text, titles, names: leave intact. Clusters of tells matter more than one word.

## Code style

- TypeScript / JS: Biome only (no ESLint/Prettier).
- Desktop: module-first under `apps/desktop/src/modules/`; invoke Rust via `src/tauri/commands.ts`; prefer `@/db` for SQLite settings.
- Web: TanStack Start; tokens from `@snapglow/design-tokens`; components from `@snapglow/ui`.
- Mobile: Expo 56; `@snapglow/ui-native` + `tokens.native`; shared logic in `editor-core` / `redaction-core`.
- API: Fastify; see `.cursor/rules/api-architecture.mdc`.
- Commits: Conventional Commits; mise hooks (lint-staged + commitlint).

## Boundaries

**Always**

- Privacy-first: no telemetry, no cloud upload without explicit user action.
- Keep desktop domain code in `modules/`; match existing patterns; minimal diffs.
- Use mise as the dev entry point.
- Run `mise run lint` / `typecheck` (and tests for touched surfaces) before calling the work done.

**Ask first**

- Commit / push / force-push.
- Product name, domains, pricing, or auth provider changes.
- Large infra, deploy, or DNS work.

**Never**

- Commit secrets or real API keys (`.env*` is gitignored).
- Invent deploy / DNS / cloud account setup unless asked.
- Skip path-scoped architecture rules for the app you are editing.
- Add ESLint/Prettier.

## Docs

[`README.md`](README.md), [`design.md`](design.md), [`docs/internal/`](docs/internal/) (ADRs and sprint history), [`.cursor/rules/`](.cursor/rules/).

## Done checklist

1. Lint / typecheck green on touched packages/apps.
2. Tests for touched surfaces when behavior changed.
3. Say what was not verified (Docker down, missing keys, simulator, etc.).
