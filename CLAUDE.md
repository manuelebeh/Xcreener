@AGENTS.md

# Claude Code notes

- Path-scoped rules: `.claude/rules/` (copies of `.cursor/rules/*-architecture.mdc` with Claude `paths` frontmatter; `mobile-architecture` is longer on the Claude side).
- Project skills: edit only `.agents/skills/`. Claude Code loads via `.claude/skills/` (symlinks). Codex/Gemini/Copilot read `.agents/skills/` directly.
- Workflow/architecture detail lives under `.cursor/rules/` (mirrored to `.claude/rules/` for path-scoped files; `mobile-architecture` is not identical).
- Marketing skills expect `.agents/product-marketing.md`. Keep it updated.
- Prefer editing `AGENTS.md` for repo-wide guidance; keep this file thin.
- Do not duplicate architecture rules here.
- Always-on behavioral guidelines (Karpathy, no-ai-slop) live in `AGENTS.md`. Cursor also has `.cursor/rules/` mirrors (`alwaysApply`). Skills: `karpathy-guidelines`, `no-ai-slop`.
