@AGENTS.md

# Claude Code notes

- Path-scoped rules: `.claude/rules/` (same content as `.cursor/rules/*-architecture.mdc`, Claude `paths` frontmatter).
- Project skills: edit only `.agents/skills/`. Claude Code loads via `.claude/skills/` (symlinks). Codex/Gemini/Copilot read `.agents/skills/` directly.
- Workflow/architecture detail lives under `.cursor/rules/` (mirrored to `.claude/rules/` for path-scoped files).
- Marketing skills expect `.agents/product-marketing.md`. Keep it updated.
- Prefer editing `AGENTS.md` for repo-wide guidance; keep this file thin.
- Do not duplicate architecture rules here.
- Always-on behavioral guidelines (Karpathy, no-ai-slop) live in `AGENTS.md`. Cursor also has `.cursor/rules/` mirrors (`alwaysApply`). Skills: `karpathy-guidelines`, `no-ai-slop`.
