# Frontend (desktop & future web)

## Desktop (`apps/desktop`)

- React 19 + Vite + TypeScript; path alias `@/` → `src/`
- Feature modules: `src/modules/{capture,editor,export,settings}/`
- Public module API via `index.ts`; use Zustand stores per module
- Routes in `src/app/routes.tsx`; providers in `src/app/providers/`
- Tauri IPC: `src/tauri/commands.ts`, events in `src/tauri/events.ts`

## Lint / format

Biome only — extends `@snapglow/biome-config`. No ESLint or Prettier.

## UI polish

Use the Hallmark skill (`.cursor/skills/hallmark/`) for visual QA on new UI.

## Future web (Sprint 0.2)

Astro landing — not Next.js. Shared tokens will live in `packages/design-tokens/`.
