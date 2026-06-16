# SnapGlow — Agent guide

Privacy-first screenshot app. Monorepo: **Tauri desktop** (now) → **TanStack Start web** → **Expo mobile** → **Fastify API**.

## Stack

| Area | Choice |
|------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Dev CLI | [mise](https://mise.jdx.dev/) — `dev:desktop`, `dev:web`, `tokens:build`, `storybook`, `lint`, `typecheck`, `test` |
| Desktop | Tauri v2, React 19, Vite, TypeScript |
| Web | TanStack Start, Nitro, Tailwind v4 |
| Design system | `packages/design-tokens` + `packages/ui` (Storybook) |
| Lint / format | Biome (not ESLint/Prettier) |
| State | Zustand per module |
| Local DB | `@tauri-apps/plugin-sql` (SQLite) |
| Commits | Conventional Commits; mise git hooks (lint-staged + commitlint) |

## Repo map

```
apps/desktop/          Tauri app (@snapglow/desktop)
apps/web/              Landing (@snapglow/web)
packages/design-tokens/  DTCG tokens → CSS
packages/ui/           Shared React components + Storybook
packages/              biome-config, typescript-config
docs/internal/         Product & technical specs
.agents/rules/         Workflow rules for agents
```

## Commands

```bash
mise trust && mise install && mise run install && mise run install-hooks
mise run tokens:build   # before first dev if tokens dist missing
mise run dev:desktop    # Tauri dev
mise run dev:web        # Landing (port 3000)
mise run storybook      # UI components (port 6006)
mise run lint
mise run typecheck
mise run test
```

Desktop e2e:
- Playwright smoke UI: `pnpm --filter @snapglow/desktop test:e2e`
- Native integration: `mise run test:e2e:native` (WebDriver on Linux/Windows; `cargo test` fallback on macOS — [Tauri limitation](https://v2.tauri.app/develop/tests/webdriver/))

Rust: `cd apps/desktop/src-tauri && cargo test`

Releases: tag `v*` triggers `.github/workflows/release.yml` (draft GitHub Release + updater). See `docs/internal/technical/release-signing.md`.

## Architecture

- **Modules:** `apps/desktop/src/modules/{capture,editor,export,history,redaction,settings}/`
- **ADR-001:** monorepo + modules
- **ADR-002:** design tokens + UI + web
- **ADR-003:** IPC commands/events
- **ADR-004:** tray, shortcuts, autostart
- **ADR-005:** updater, releases, signing roadmap
- **ADR-006:** native capture overlay
- Invoke Rust via `src/tauri/commands.ts`; prefer `@/db` for SQLite settings
- **Sprint 1.1** : capture native macOS validée en QA (zone / fenêtre / écran) ; parité Windows restante (P1-002, P1-004, P1-005)
- **Sprint 1.2** : moteur beautification Canvas 2D (dégradés, padding, radius, ombre, fond custom)
- **Sprint 1.3** : presets format (sociaux + ratios), drag/zoom (outil Move), `PresetBar` + `StyleBar`, presets custom SQLite
- **Sprint 1.4** : annotations (texte, formes, highlight, flou manuel), `AnnotationToolbar`, layers 4–5, undo/redo (20 niveaux)
- **Sprint 1.5** : redaction on-device (OCR macOS/Windows + détecteurs regex), `RedactionBar`, masquage → `BlurAnnotation` ; export WYSIWYG PNG/JPG/WebP, clipboard (`Image.fromBytes` + `image-png`), drag-out (`ExportBar`)
- **Sprint 1.6** : historique 30 captures (`modules/history/`, `db/captures.ts`, PNG + miniatures WebP), route `/history`, E2E natif `capture-beautify-export`, perf/stress tests, builds beta unsigned (voir `release-signing.md` §5)

## Agent conventions

1. **CodeGraph > grep** for exploring structure across TS and Rust.
2. **Hallmark** (`.cursor/skills/hallmark/`) for UI/UX polish on frontend work.
3. **Privacy-first:** no telemetry, no cloud upload without explicit user action.
4. **Minimal diffs:** match existing patterns; don't add ESLint/Prettier.
5. **mise** is the dev entry point — add new apps as `dev:*` tasks, not ad-hoc root scripts.

## Multi-app roadmap

| Phase | App | mise task |
|-------|-----|-----------|
| 0.1 | desktop | `dev:desktop` |
| 0.2 | web (TanStack Start) | `dev:web` |
| 1b | mobile (Expo) | `dev:mobile` |
| 2b | api (Fastify) | `dev:api` |

Rules for future surfaces: `.agents/rules/mobile.md`, `api.md` (Phase 1b / 2b).
