# ADR-002 - Design tokens, shared UI, and web landing

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.2

## Context

Sprint 0.2 needs a shared visual foundation for desktop and marketing web, plus a landing page. Figma deliverables run in parallel; code starts from a provisional SnapGlow palette.

## Decision

### Design tokens (`packages/design-tokens`)

- **SSOT:** `tokens.json` in [DTCG](https://tr.designtokens.org/format/) format
- **Build:** `node scripts/build.mjs` → `dist/tokens.css` (CSS variables) + `dist/tailwind-theme.css` (`@theme` for Tailwind v4)
- **Task:** `mise run tokens:build`

### Shared UI (`packages/ui`)

- React 19 + Tailwind v4 + Radix primitives (slider, tooltip, dropdown)
- Components: `Button`, `Input`, `Label`, `Select`, `Slider`, `Tooltip`, `Dropdown`
- `ThemeProvider` / `useTheme` for `data-theme` light/dark/system
- Storybook in-package: `mise run storybook` (includes `@storybook/addon-a11y`)

### Desktop product design (`design.md`)

- Sprint 1.6 (P1-037): locked UX/layout doc at repo root - complements tokens/UI packages
- Covers macrostructure (Feature Stack), nav (N1b), typography (IBM Plex), semantic token mapping, editor tool order
- Code SSOT remains `packages/design-tokens/tokens.json`; `design.md` is the product-level rule set for desktop surfaces

### Web landing (`apps/web`)

- **TanStack Start** + Nitro + Vite 8
- Package: `@snapglow/web`
- Consumes `@snapglow/design-tokens` and `@snapglow/ui`
- Local dev: `mise run dev:web` (port 3000)
- VPS deploy deferred; CI smoke-builds via `pnpm --filter @snapglow/web build`

### Git hooks

- Husky removed (Sprint 0.1 temporary)
- **mise** tasks `pre-commit` (lint-staged) and `commit-msg` (commitlint)
- After clone: `mise run install-hooks`

## Consequences

- New surfaces import tokens/UI instead of duplicating Tailwind config
- `routeTree.gen.ts` is generated (`pnpm run generate-routes` in web build); excluded from Biome
- Web requires Node 24+ (mise) and Vite 8 optional native bindings on some platforms

## References

- [design.md](../../../../design.md) - desktop product design system (Sprint 1.6)
- [ADR-001](./001-monorepo-and-module-architecture.md)
- [accessibility-audit.md](../accessibility-audit.md)
- [Sprints & Implementations.md](../../product/Sprints%20%26%20Implementations.md)
