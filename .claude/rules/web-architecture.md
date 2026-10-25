---
paths:
  - "apps/web/**/*.{ts,tsx,css,mjs,js}"
---

# apps/web

- Public marketing landing + share viewer (`/s/:token`). TanStack Start + Nitro + Tailwind v4 (`@xcreener/web`).
- Design tokens from `@xcreener/design-tokens`; shared components from `@xcreener/ui`. Follow root [`design.md`](design.md).
- Cloud share viewer talks to the API for public share metadata only. Prefer `@xcreener/cloud-core` types.
- Dev: `mise run dev:web` (port 3000). Build: `pnpm --filter @xcreener/web build`.
- Keep marketing sections purposeful. Prefer existing UI package components over one-off layouts.
- More shared frontend detail: `.cursor/rules/frontend.mdc`.
