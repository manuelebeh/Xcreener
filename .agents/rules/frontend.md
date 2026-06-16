# Frontend (desktop & web)

## Shared design system

- **Tokens:** `packages/design-tokens` — DTCG `tokens.json`, build via `mise run tokens:build`
- **Components:** `packages/ui` — Button, Input, Select, Slider, Tooltip, Dropdown, ThemeProvider
- **Storybook:** `mise run storybook` (port 6006)

## Desktop (`apps/desktop`)

- React 19 + Vite + Tailwind v4 + TypeScript; path alias `@/` → `src/`
- Imports `@snapglow/ui` and design tokens
- Feature modules: `src/modules/{capture,editor,export,history,redaction,settings}/`
- Public module API via `index.ts`; use Zustand stores per module
- Routes in `src/app/routes.tsx`; providers in `src/app/providers/`
- Tauri IPC: `src/tauri/commands.ts`, events in `src/tauri/events.ts`

## Web (`apps/web`)

- TanStack Start + Nitro + Tailwind v4 — `@snapglow/web`
- Landing page at `/`; dev on port 3000 via `mise run dev:web`
- VPS deploy deferred; local build: `pnpm --filter @snapglow/web build`

## Lint / format

Biome only — root `biome.json` extends `@snapglow/biome-config`. No ESLint or Prettier.

## UI polish

Use the Hallmark skill (`.cursor/skills/hallmark/`) for visual QA on new UI.
