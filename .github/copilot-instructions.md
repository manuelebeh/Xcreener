# GitHub Copilot — repository instructions

Primary agent guidance lives in [`AGENTS.md`](../AGENTS.md) (cross-tool standard).

Follow that file for setup commands, boundaries, monorepo layout, Biome/mise, and package ownership.

**Skills:** load from [`.agents/skills/`](../.agents/skills/) when a workflow matches (marketing, design, impeccable, …). Marketing skills also use [`.agents/product-marketing.md`](../.agents/product-marketing.md).

Path-specific architecture (when editing matching files):

- `apps/api/**` → Fastify cloud API; see `.cursor/rules/api-architecture.mdc`
- `apps/desktop/**` → Tauri + React modules (`modules/` + IPC)
- `apps/web/**` → TanStack Start landing + share viewer; `@snapglow/ui` / design-tokens
- `apps/mobile/**` → Expo SDK 56; `@snapglow/ui-native`
- `packages/**` → design-tokens owns tokens; `*-core` shared domain; `@snapglow/sdk` client-only
