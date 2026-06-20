# SnapGlow - Agent guide

Privacy-first screenshot app. Monorepo: **Tauri desktop** (now) → **TanStack Start web** → **Expo mobile** → **Fastify API**.

## Stack

| Area | Choice |
|------|--------|
| Monorepo | pnpm workspaces + Turborepo |
| Dev CLI | [mise](https://mise.jdx.dev/) - `dev:desktop`, `dev:web`, `dev:mobile`, `tokens:build`, `storybook`, `lint`, `typecheck`, `test` |
| Desktop | Tauri v2, React 19, Vite, TypeScript |
| Web | TanStack Start, Nitro, Tailwind v4 |
| Mobile | Expo SDK 56, Expo Router, development builds |
| Design system | `packages/design-tokens` + `packages/ui` (web) + `packages/ui-native` (RN) |
| Editor core | `packages/editor-core` — layout, presets, annotations (shared desktop + mobile) |
| Lint / format | Biome (not ESLint/Prettier) |
| State | Zustand per module |
| Local DB | `@tauri-apps/plugin-sql` (SQLite) |
| Commits | Conventional Commits; mise git hooks (lint-staged + commitlint) |

## Repo map

```
apps/desktop/          Tauri app (@snapglow/desktop)
apps/web/              Landing (@snapglow/web)
apps/mobile/           Expo app (@snapglow/mobile)
packages/design-tokens/  DTCG tokens → CSS + tokens.native
packages/editor-core/    Shared editor logic (layout, presets, annotations)
packages/redaction-core/ Shared on-device detectors + mapRegionToLayout (desktop + mobile)
packages/style-suggestion-core/ Content class → style mapping for AI suggestions (desktop)
packages/ocr-core/           OCR types + text assembly helpers (desktop copy-text)
packages/ui/           Shared React web components + Storybook
packages/ui-native/    Shared React Native components
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
mise run dev:mobile     # Expo dev client
mise run storybook      # UI components (port 6006)
mise run lint
mise run typecheck
mise run test
```

Desktop e2e:
- Playwright smoke UI: `pnpm --filter @snapglow/desktop test:e2e`
- Native integration: `mise run test:e2e:native` (WebDriver on Linux/Windows; `cargo test` fallback on macOS - [Tauri limitation](https://v2.tauri.app/develop/tests/webdriver/))

Rust: `cd apps/desktop/src-tauri && cargo test`

Releases: tag `v*` triggers `.github/workflows/release.yml` (draft GitHub Release + updater). See `docs/internal/technical/release-signing.md`.

## Architecture

- **Modules:** `apps/desktop/src/modules/{capture,editor,export,history,redaction,settings}/`
- **ADR-001:** monorepo + modules
- **ADR-002:** design tokens + UI + web
- **Design system (desktop):** `design.md` - layout, typography, tokens mapping (Hallmark locked, Sprint 1.6)
- **ADR-003:** IPC commands/events
- **ADR-004:** tray, shortcuts, autostart
- **ADR-005:** updater, releases, signing roadmap
- **ADR-006:** native capture overlay
- Invoke Rust via `src/tauri/commands.ts`; prefer `@/db` for SQLite settings
- **Sprint 1.1** : capture native macOS + Windows validée en QA (zone / fenêtre / écran)
- **Sprint 1.2** : moteur beautification Canvas 2D (dégradés, padding, radius, ombre, fond custom)
- **Sprint 1.3** : presets format (sociaux + ratios), drag/zoom (outil Move), `PresetBar` + `StyleBar`, presets custom SQLite
- **Sprint 1.4** : annotations (texte, formes, highlight, flou manuel), `AnnotationToolbar`, layers 4–5, undo/redo (20 niveaux)
- **Sprint 1.5** : redaction on-device (OCR macOS/Windows + détecteurs regex), `RedactionBar`, masquage → `BlurAnnotation` ; export WYSIWYG PNG/JPG/WebP, clipboard (`Image.fromBytes` + `image-png`), drag-out (`ExportBar`)
- **Sprint 1.6** : historique 30 captures (`modules/history/`, `db/captures.ts`, PNG + miniatures WebP), route `/history`, E2E natif `capture-beautify-export`, perf/stress tests, builds beta unsigned (voir `release-signing.md` §5) ; polish UX P1-037 (`design.md`, Feature Stack editor, warm tokens, `AppTopNav`)
- **Sprint 1b.1** : app mobile Expo (`apps/mobile/`), share import iOS/Android (`expo-share-intent`), `@snapglow/ui-native` + `tokens.native`, dev builds (`dev:mobile`)
- **Sprint 1b.2** : `@snapglow/editor-core`, éditeur Skia mobile (presets, annotations tactiles), export Photos + share sheet (`modules/export/`) — preview-scaled
- **Sprint 1b.3** : `@snapglow/redaction-core`, redaction mobile (`snapglow-ocr` Vision/ML Kit, `RedactionBar`), export pleine résolution (`ExportCanvas`), EAS/store prep, matrice QA devices
- **Sprint 2b.1** : `@snapglow/style-suggestion-core`, classification on-device desktop (`classify_content_command`), UI `StyleSuggestionBar`, training tooling (`tools/style-classifier/`) — **modèle ML non entraîné** (pas de dataset ; fallback heuristique)
- **Sprint 2b.2** : `@snapglow/ocr-core`, OCR copy-text desktop (`recognize_text_command`), UI `TextExtractionBar`, auto-crop (`detect_content_bounds_command`), compression export (`compress_export_bytes_command`)
- **Sprint 2b.3** : capture scrollante viewport (`capture_scrolling_window_command`, Home + Page Down + stitch), timer différé + mode Menu (`capture_native_command`), HUD progress + `stop_scrolling_capture_command`, ADR-007 — **QA OK**, améliorations stitch en backlog

## Agent conventions

1. **CodeGraph > grep** for exploring structure across TS and Rust.
2. **Hallmark** (`.cursor/skills/hallmark/`) for UI/UX polish - read `design.md` first (locked system; conformance, not macrostructure rotation).
3. **Privacy-first:** no telemetry, no cloud upload without explicit user action.
4. **Minimal diffs:** match existing patterns; don't add ESLint/Prettier.
5. **mise** is the dev entry point - add new apps as `dev:*` tasks, not ad-hoc root scripts.

## Multi-app roadmap

| Phase | App | mise task |
|-------|-----|-----------|
| 0.1 | desktop | `dev:desktop` |
| 0.2 | web (TanStack Start) | `dev:web` |
| 1b | mobile (Expo) | `dev:mobile` |
| 2b | api (Fastify) | `dev:api` |

Rules for future surfaces: `.agents/rules/mobile.md` (Expo SDK 56 docs), `api.md` (Phase 2b).
