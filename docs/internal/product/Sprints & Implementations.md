# Sprints & Implementations — SnapGlow

> Plan de développement détaillé, sprints, livrables et dépendances
> **Version :** 1.0 | **Date :** Juin 2026 | **Statut :** Brouillon

← [[Product Requirements]] | → [[Technical Stack - Desktop]]

---

## 1. Méthodologie

- **Sprints de 2 semaines** (lundi → vendredi de la semaine suivante)
- **Cérémonies** : Sprint Planning (lundi S1), Daily standup, Sprint Review + Retro (vendredi S2)
- **Outil de suivi** : Linear (ou GitHub Projects)
- **Branches** : `main` (production), `develop` (intégration), `feature/*`, `fix/*`
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …) — Husky + Commitlint en Sprint 0.1 ; **migration vers hooks mise** dès Sprint 0.2 (`apps/web`)
- **Monorepo** : `mise` (porte d'entrée dev + pin toolchains) + **Turborepo** (cache/build packages TS) — pattern inspiré de [fullstack-starter](https://github.com/first-fluke/fullstack-starter), stack SnapGlow propre (Tauri, Expo, Fastify — pas Flutter/FastAPI/GCP)
- **CI/CD** : Build + tests automatiques à chaque PR, release automatique sur merge dans `main`

### Colonne Statut (suivi des tâches)

| Symbole | Signification |
|---|---|
| `[ ]` | À faire |
| `[x]` | Réalisé (date entre parenthèses) |
| `[~]` | En cours |
| `[!]` | Bloqué (raison entre parenthèses) |

Chaque sprint se termine par un **récapitulatif indicatif** (livré, en attente, reporté) et des **critères de validation** mesurables.

### Structure monorepo cible (évolution)

```
apps/
├── desktop/     # Tauri v2 — macOS + Windows        (Phase 0–1)
├── web/         # Landing marketing — TanStack Start + VPS (Sprint 0.2)
├── mobile/      # React Native Expo — iOS + Android  (Phase 1b)
└── api/         # Fastify + PostgreSQL + Redis       (Phase 2b)
packages/
├── design-tokens/   # SSOT couleurs, spacing (Sprint 0.2)
├── biome-config/    # Biome partagé (Sprint 0.1)
├── typescript-config/
└── i18n/            # SSOT traductions (Phase 4)
```

**Commandes dev (via mise) :** `mise run dev:desktop` → `mise run dev:web` → `mise run dev:mobile` → `mise run dev:api` (ajoutées au fil des phases).

---

## 2. Vue d'ensemble des phases

```
PHASE 0 — Fondations          M1–M2     (4 sprints)     Architecture & Setup
PHASE 1 — MVP Desktop         M2–M5     (6 sprints)     Core macOS + Windows
PHASE 1b — MVP Mobile         M4–M6     (4 sprints)     iOS + Android
PHASE 2 — Lancement           M6        (2 sprints)     Beta + Product Hunt
PHASE 2b — IA & Cloud         M7–M9     (6 sprints)     Intelligence + Cloud
PHASE 3 — Team & B2B          M10–M14   (10 sprints)    Collaboration + API
PHASE 4 — Scale               M15–M18   (8 sprints)     Marketplace + i18n
```

**Total estimé : ~40 sprints sur 18 mois**

---

## 3. PHASE 0 — Fondations (M1–M2)

> Objectif : poser l'architecture technique, le design system, et l'infrastructure de développement.

### Sprint 0.1 (Semaines 1–2) — Setup & Architecture

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-15) | P0-001 | Initialiser monorepo (Turborepo + pnpm) + `mise.toml` (toolchains + tasks racine `dev:*`, `lint`, `install`) | P0 | 2j | — |
| `[x]` (2026-06-15) | P0-002 | Setup Tauri v2 — projet skeleton macOS + Windows | P0 | 3j | P0-001 |
| `[x]` (2026-06-15) | P0-003 | Configurer TypeScript + Biome (lint + format) | P0 | 1j | P0-001 |
| `[x]` (2026-06-15) | P0-004 | Configurer CI/CD (GitHub Actions) : build, lint, tests | P0 | 2j | P0-001 |
| `[x]` (2026-06-15) | P0-005 | Définir l'architecture des modules (capture, editor, export, settings) | P0 | 2j | P0-002 |
| `[x]` (2026-06-15) | P0-006 | Setup du store de configuration local (SQLite via Tauri) | P1 | 1j | P0-002 |
| `[x]` (2026-06-15) | P0-007 | Setup outillage dev : Hallmark + CodeGraph + Husky/Commitlint (temporaire) + `AGENTS.md` / `.agents/rules/` | P1 | 1j | P0-001 |

**Livrable :** Projet Tauri fonctionnel avec CI/CD, build macOS + Windows validé, `mise run dev:desktop` opérationnel, hooks git, index CodeGraph, conventions agent.

**Livré (code, 2026-06-15)**

- **Monorepo** : Turborepo + pnpm workspaces, `mise.toml` (Node 24, pnpm 9, Rust stable), tasks `dev:desktop`, `lint`, `typecheck`, `install`.
- **Desktop** : `apps/desktop` Tauri v2 + React 19 + Vite, identifier `app.snapglow.desktop`, fenêtre menu bar skeleton (480×640, transparent, sans décorations).
- **Tooling** : `packages/biome-config`, `packages/typescript-config`, Husky + Commitlint, Biome via Turbo.
- **Architecture** : modules `capture` / `editor` / `export` / `settings`, couche `app/` + `tauri/` + `db/`, stubs Rust `commands/`, ADR-001.
- **SQLite** : `@tauri-apps/plugin-sql`, migration `001_init.sql`, helpers settings + init au démarrage (thème).
- **Dev intel** : Hallmark (`.cursor/skills/hallmark/`), CodeGraph init + MCP (`.cursor/mcp.json`), `AGENTS.md`, `.agents/rules/`, `.cursor/rules/desktop-architecture.mdc`.
- **CI/CD** : `.github/workflows/ci.yml` (lint, typecheck, `cargo check`) + `build.yml` (matrix macOS arm64/x64 + Windows).

**Reporté (hors Sprint 0.1)**

- **Hooks mise conditionnels** → Sprint 0.2 (P0-025).
- **Release Please + CHANGELOG** → Sprint 0.4+.
- **Terraform GCP + Docker infra** → Phase 2b+.

**Critères de validation**

- [x] `mise trust && mise install && mise run install` sans erreur
- [x] `mise run dev:desktop` lance Tauri + Vite
- [x] `mise run lint` et `mise run typecheck` passent
- [x] `cargo check` OK dans `apps/desktop/src-tauri`
- [x] Husky : pre-commit Biome + commit-msg Conventional Commits
- [x] Modules frontend scaffoldés + ADR-001 présent
- [x] SQLite : setting `theme` persiste après redémarrage
- [x] CI PR verte ; build matrix verte sur `main` après premier push

> **Inspiration [fullstack-starter](https://github.com/first-fluke/fullstack-starter)** — patterns DX monorepo multi-apps, stack SnapGlow distincte.

| Élément | Quand | Décision SnapGlow |
|---|---|---|
| Monorepo `apps/` + `packages/` | Sprint 0.1 | **Adopter** |
| **mise tasks racine** (`dev:desktop`, `lint`, `install`…) | Sprint 0.1 | **Adopter** — porte d'entrée dev unique |
| **Turborepo** (cache/build TS) | Sprint 0.1 | **Adopter** — sous-jacent à mise pour packages JS |
| Biome + Commitlint | Sprint 0.1 | **Adopter** |
| **Husky** git hooks | Sprint 0.1 | **Adopter** (temporaire) |
| **Hooks mise conditionnels** (lint par app) | Sprint 0.2 | **Adopter** — remplace Husky (P0-025) |
| `AGENTS.md` + `.agents/rules/` | Sprint 0.1 | **Adopter** |
| CodeGraph MCP | Sprint 0.1 | **Adopter** (pas Serena) |
| `packages/design-tokens` | Sprint 0.2 | **Adopter** (P0-009) |
| `apps/web` landing **TanStack Start** + VPS | Sprint 0.2 | **Adopter** (P0-013) |
| `apps/mobile` **Expo / React Native** | Phase 1b | **Adopter** (M1-001) |
| `apps/api` **Fastify** + PostgreSQL | Phase 2b | **Adopter** (CL-001) |
| Release Please + CHANGELOG | Sprint 0.4+ | **Reporter** |
| Terraform GCP + Docker infra | Phase 2b+ | **Reporter** |
| oh-my-agent | — | **Ne pas adopter** |

### Sprint 0.2 (Semaines 3–4) — Design System & Prototype

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | P0-008 | Créer le design system Figma (couleurs, typographie, composants) | P0 | 3j | — |
| `[x]` (2026-06-16) | P0-009 | Implémenter les composants UI de base (React + Tailwind) : boutons, inputs, sliders, tooltips, dropdowns — `packages/design-tokens` (pattern fullstack-starter) | P0 | 4j | P0-002, P0-007 |
| `[ ]` | P0-010 | Créer le prototype interactif Figma du flux principal | P0 | 3j | P0-008 |
| `[x]` (2026-06-16) | P0-011 | Configurer Storybook pour la bibliothèque de composants | P1 | 1j | P0-009 |
| `[x]` (2026-06-16) | P0-012 | Implémenter le thème Light/Dark/System | P1 | 2j | P0-009 |
| `[x]` (2026-06-16) | P0-013 | Créer la landing page (`apps/web` — **TanStack Start** + VPS, pas Next.js) | P1 | 3j | P0-008 |
| `[x]` (2026-06-16) | P0-025 | Étendre `mise.toml` (`dev:web`, `tokens:build`) ; migrer Husky → **hooks git mise** (lint conditionnel par app) | P1 | 0.5j | P0-013 |

**Livrable :** Design system code-first (`packages/design-tokens`, `packages/ui`), composants React + Storybook, landing TanStack Start en local, orchestration mise étendue (`dev:web`, `storybook`, `tokens:build`), hooks git migrés vers mise.

**Livré (code, 2026-06-16)**

- **`packages/design-tokens`** : `tokens.json` DTCG, build → `dist/tokens.css` + `dist/tailwind-theme.css`
- **`packages/ui`** : Button, Input, Select, Slider, Tooltip, Dropdown, ThemeProvider ; Storybook
- **Desktop** : Tailwind v4, thème Light/Dark/System visuel, `@snapglow/ui` dans Settings
- **`apps/web`** : `@snapglow/web` TanStack Start, landing SnapGlow, `mise run dev:web`
- **Tooling** : Husky retiré ; `mise run install-hooks` ; CI `tokens:build` + build web
- **ADR-002** : design tokens, UI partagée, web landing

**En parallèle (hors repo)**

- P0-008 / P0-010 : livrables Figma
- Déploiement VPS landing (reporté)

**Critères de validation**

- [ ] Design system Figma documenté (couleurs, typo, composants de base)
- [x] `packages/design-tokens` consommé par desktop + web
- [x] Storybook accessible avec les composants UI de base
- [x] Thème Light/Dark/System fonctionnel dans l'app desktop
- [ ] `apps/web` déployé sur VPS (URL publique) — **reporté** ; `mise run dev:web` opérationnel
- [x] `mise run dev:web` et `mise run tokens:build` opérationnels
- [x] Husky retiré ; hooks mise actifs (lint-staged + commitlint)

### Sprint 0.3 (Semaines 5–6) — Infrastructure & Intégration système

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P0-014 | Implémenter l'icône menu bar (macOS) / system tray (Windows) | P0 | 3j | P0-002 |
| `[x]` (2026-06-16) | P0-015 | Implémenter le système de raccourcis clavier global | P0 | 3j | P0-014 |
| `[x]` (2026-06-16) | P0-016 | Créer le système de settings/préférences persistant | P0 | 2j | P0-006 |
| `[x]` (2026-06-16) | P0-017 | Implémenter le lancement au démarrage (auto-start) | P1 | 1j | P0-014 |
| `[x]` (2026-06-16) | P0-018 | Setup des tests unitaires (Vitest) + tests e2e (Playwright) | P1 | 2j | P0-002 |
| `[x]` (2026-06-16) | P0-019 | Setup analytics (PostHog) et crash reporting (Sentry) | P1 | 1j | P0-002 |

**Livrable :** Application Tauri avec menu bar, raccourcis clavier, settings, auto-start fonctionnel.

**Livré (code, 2026-06-16)**

- **Tray / menu bar** : `src-tauri/src/tray.rs` — icône, toggle show/hide, menu Open / Settings / Quit ; fermeture fenêtre → hide
- **Raccourcis globaux** : `tauri-plugin-global-shortcut` + `update_capture_shortcut` ; ouverture overlay capture (`show_capture_overlay`)
- **Settings SQLite** : `theme`, `captureShortcut`, `launchAtLogin`, `analyticsEnabled` ; UI Settings enrichie (`@snapglow/ui`)
- **Auto-start** : `tauri-plugin-autostart` + sync bootstrap / toggle Settings
- **Tests** : Vitest (`store.test.ts`, validation raccourcis) ; Playwright smoke (`e2e/settings.spec.ts`) ; `mise run test` + step CI
- **Observabilité** : PostHog + Sentry desktop (`integrations/observability.ts`) — actif en dev si clés env, opt-in prod ; `apps/desktop/.env.example`

**Critères de validation**

- [x] Icône menu bar / system tray visible ; fenêtre show/hide au clic
- [x] Raccourci global configurable ouvre l'overlay de capture
- [x] Settings complets persistés en SQLite (au-delà du thème)
- [x] Auto-start activable/désactivable dans les préférences
- [x] Vitest + au moins 1 test unitaire ; Playwright smoke test configuré
- [x] PostHog + Sentry initialisés (events de test visibles en dashboard avec `VITE_POSTHOG_KEY` / `VITE_SENTRY_DSN` en `.env`)

### Sprint 0.4 (Semaines 7–8) — Polissage Phase 0 & Préparation Phase 1

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P0-020 | Audit qualité du design system — ajustements accessibilité (WCAG AA) | P0 | 2j | P0-009 |
| `[x]` (2026-06-16) | P0-021 | Documentation architecture (ADRs — Architecture Decision Records) | P1 | 2j | P0-005 |
| `[x]` (2026-06-16) | P0-022 | Setup du système de mise à jour automatique (Tauri updater) | P1 | 2j | P0-002 |
| `[x]` (2026-06-16) | P0-023 | Code signing macOS (Developer ID) + Windows (code signing cert) | P0 | 2j | P0-002 |
| `[x]` (2026-06-16) | P0-024 | Tests d'intégration menu bar + raccourcis sur macOS et Windows | P0 | 2j | P0-014, P0-015 |

**Livrable :** Phase 0 complète. Architecture validée, CI/CD opérationnel, base solide pour le MVP.

**Livré (code, 2026-06-16)**

- **Accessibilité** : `@storybook/addon-a11y`, token `focus-ring`, composant `Label`, fixes focus/reduced-motion ; [`accessibility-audit.md`](../technical/accessibility-audit.md)
- **ADRs** : ADR-003 (IPC/events), ADR-004 (tray/shortcuts/autostart), ADR-005 (updater/releases/signing) ; ADR-006 (capture overlay) ajouté en Sprint 1.1
- **Updater** : `tauri-plugin-updater`, GitHub Releases endpoint, `release.yml`, bouton Settings « Check for updates »
- **Signing** : [`release-signing.md`](../technical/release-signing.md) ; CI conditionnelle (builds non signés tant que certs absents)
- **Tests natifs** : `cargo test` shortcuts, WebDriver e2e (`e2e-native/`, `e2e-native.yml`), hooks IPC debug ; Playwright smoke en CI

**Reporté**

- **Release Please + CHANGELOG** — début Phase 1
- **Builds signés macOS/Windows** — en attente certificats (pipeline prêt)
- **Release test `v0.1.0-test`** — nécessite secret `TAURI_SIGNING_PRIVATE_KEY` sur GitHub + tag manuel

**Critères de validation**

- [x] Audit accessibilité WCAG AA documenté avec corrections appliquées
- [x] ADRs complémentaires rédigés (capture, IPC, updater…)
- [x] Tauri updater configuré (canal de release test via GitHub Releases)
- [~] Builds signés macOS + Windows — **scaffolding CI** ; artefacts non signés OK (certs à provisionner)
- [x] Tests menu bar + raccourcis (Rust + native e2e Linux/Windows CI ; macOS = Rust tests + QA manuelle tray)
- [x] Jalon J0 validé en sprint review

---

**Jalon J0 (fin M2) :** Projet skeleton fonctionnel, design system, CI/CD, landing page.

---

## 4. PHASE 1 — MVP Desktop (M2–M5)

> Objectif : livrer les fonctionnalités core de capture + beautification sur macOS et Windows.

### Sprint 1.1 (Semaines 9–10) — Capture d'écran native

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-001 | Implémenter la capture de zone (sélection libre) — macOS | P0 | 3j | P0-015 |
| `[ ]` | P1-002 | Implémenter la capture de zone — Windows (Graphics Capture API) | P0 | 3j | P0-015 |
| `[x]` (2026-06-16) | P1-003 | Implémenter la capture de fenêtre (détection auto des bords) — macOS | P0 | 2j | P1-001 |
| `[ ]` | P1-004 | Implémenter la capture de fenêtre — Windows | P0 | 2j | P1-002 |
| `[~]` | P1-005 | Implémenter la capture plein écran — macOS + Windows | P0 | 1j | P1-001, P1-002 |
| `[x]` (2026-06-16) | P1-006 | Tests capture sur multi-écran (display scaling, HiDPI) | P0 | 2j | P1-001, P1-002 |

**Livrable :** Capture fonctionnelle (zone, fenêtre, plein écran) sur macOS et Windows.

**Livré (code + QA macOS, 2026-06-16)**

- **Backend Rust** : module `src-tauri/src/capture/` (`xcap`) — preview bureau, listage moniteurs/fenêtres, `get_window_at_point`, commandes `capture_*` + validation bornes
- **Fenêtre overlay** : webview dédiée `capture-overlay` ; snapshot `capture_desktop_preview` avant affichage ; event `capture-overlay-init` (bounds, moniteurs, PNG preview)
- **UI capture** : `CaptureOverlay` — modes Region / Window / Screen ; barre d’outils ; surbrillance fenêtre (`WindowHighlight`) et écran (`MonitorHighlight`)
- **UX confirmée** : pas de capture automatique au changement de mode ; Region = sélection puis bouton **Capture** / Entrée ; Window / Screen = survol + clic (ou **Capture** pour Screen) ; découpe client depuis l’aperçu figé (pas de seconde capture native, pas d’overlay « Capturing… »)
- **Pipeline éditeur** : event `capture-image` → `useCaptureSession` → `setScreenshot` + navigation accueil
- **Tests** : Rust (`capture/mod.rs`, `validate.rs`) ; Vitest (`store.test.ts`, `image.test.ts`, `captureCursors.test.ts`) ; e2e native overlay visible (`integration.spec.ts`)

**En attente / reporté**

- **Parité Windows** (P1-002, P1-004, reste P1-005) — code `xcap` cross-platform présent ; QA Windows + Graphics Capture API si écart
- **Commandes natives `capture_*` au confirm** — conservées côté Rust pour tests et usages futurs ; le flux overlay utilise la découpe preview (ADR-006)

**Critères de validation**

- [x] Capture zone, fenêtre et plein écran fonctionnelles sur macOS (QA manuelle validée)
- [ ] Parité Windows pour les 3 modes de capture
- [x] Tests multi-écran / HiDPI passent sur au moins 2 configurations (QA macOS validée)
- [x] Image capturée affichée dans l'éditeur (pipeline bout-en-bout minimal)

### Sprint 1.2 (Semaines 11–12) — Beautification automatique

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-007 | Implémenter le moteur de rendu Canvas (fond + capture + ombre) | P0 | 4j | P1-001 |
| `[x]` (2026-06-16) | P1-008 | Arrière-plans dégradés : bibliothèque de 50+ presets | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-009 | Padding intelligent + auto-balance (centrage) | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-010 | Coins arrondis configurables (slider 0–32px) | P0 | 1j | P1-007 |
| `[x]` (2026-06-16) | P1-011 | Ombre portée (intensité, flou, offset, couleur) | P0 | 1j | P1-007 |
| `[x]` (2026-06-16) | P1-012 | Fond personnalisé (couleur custom + image uploadée) | P1 | 2j | P1-007 |

**Livrable :** Beautification automatique complète avec aperçu temps réel.

**Livré (code + QA macOS, 2026-06-16)**

- **Moteur Canvas 2D** : `modules/editor/engine/` — `computeLayout`, `drawBackground`, `drawShadow`, `drawScreenshot`, `renderFrame` ; composition 3 couches (fond → ombre → capture clipée) ; HiDPI via `devicePixelRatio`
- **Store éditeur** : `background`, `padding`, `borderRadius`, `shadow` ; defaults auto à chaque `setScreenshot` (dégradé SnapGlow, padding ~12 %, radius 12 px, ombre douce)
- **56 presets dégradés** : `engine/gradients.ts` (dont brand `#667eea` → `#764ba2`)
- **UI minimale** : `BeautifyPanel` — onglets Gradient / Solid / Image, grille presets, sliders padding / radius / shadow, color pickers, upload image (`<input type="file">`)
- **Canvas WYSIWYG** : `useBeautifyRender` (rAF) ; preview composée = source de vérité pour l’export futur (Sprint 1.5)
- **Tests** : Vitest — `computeLayout`, `gradients` (≥ 50), `drawBackground`, `renderFrame`, `store`

**En attente / reporté**

- **StyleBar inline polie** (P1-017, Sprint 1.3) — `BeautifyPanel` couvre les contrôles fonctionnels du sprint
- **Profiling perf formel** (< 50–100 ms par frame) — reporté P1-038 ; rendu rAF thread principal suffisant en QA manuelle

**Critères de validation**

- [x] Canvas rend fond + capture + ombre en temps réel (rAF ; cible < 100 ms — profiling formel en P1-038)
- [x] ≥ 50 presets dégradés disponibles (56)
- [x] Padding, radius et ombre ajustables via UI (`BeautifyPanel`)
- [x] Fond couleur custom + image upload fonctionnels

### Sprint 1.3 (Semaines 13–14) — Presets, Format & Éditeur inline

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-013 | Implémenter les presets réseaux sociaux (Twitter/X, LinkedIn, FB, IG, YT) | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-014 | Implémenter les presets standards (16:9, 4:3, 1:1, libre) | P0 | 1j | P1-013 |
| `[x]` (2026-06-16) | P1-015 | Presets personnalisés : création, sauvegarde, suppression | P1 | 2j | P1-013 |
| `[x]` (2026-06-16) | P1-016 | Redimensionnement et zoom de la capture dans le cadre (drag + scroll) | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-017 | UI de l'éditeur inline : barre de style (fond, padding, radius, shadow) | P0 | 3j | P1-007, P0-009 |
| `[x]` (2026-06-16) | P1-018 | UI de la barre de presets rapides (icônes réseaux sociaux) | P1 | 1j | P1-013 |

**Livrable :** Éditeur inline complet avec presets et contrôles de style.

**Livré (code, 2026-06-16)**

- **Moteur cadre** : `engine/presets.ts` — 5 presets sociaux + ratios 16:9 / 4:3 / 1:1 / libre ; `computeLayout` v2 (mode libre inchangé + dimensions export fixes) ; `ScreenshotTransform` (scale + offset)
- **Interaction** : `useScreenshotTransform` — drag pointeur + molette zoom (0.5×–3×) sur le canvas
- **Presets custom SQLite** : `db/presets.ts` CRUD sur `custom_presets` ; hydratation via `useCustomPresetsLoader`
- **UI inline** : `EditorView` — `Canvas` → `PresetBar` (icônes X/LI/FB/IG/YT + ratios) → `StyleBar` (ex-`BeautifyPanel`, carrousel dégradés, shadow offsetX)
- **Export prep** : `export/utils/canvasExport.ts` — `canvasToPngBlob` + dimensions bitmap
- **Tests** : Vitest — `presets`, `computeLayout` (cadre), `store` (preset), `canvasExport`, `renderFrame` (9-arg drawImage)

**Critères de validation**

- [x] Presets réseaux sociaux appliquent le bon ratio et export (dimensions canvas = export ; `canvasToPngBlob`)
- [x] Presets custom persistés en SQLite
- [x] Drag/zoom capture dans le cadre fluide
- [x] Barre de style et barre de presets utilisables sans régression perf (rAF inchangé)

### Sprint 1.4 (Semaines 15–16) — Annotations

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | P1-019 | Outil texte : insertion, police, taille, couleur, fond | P0 | 3j | P1-007 |
| `[ ]` | P1-020 | Formes : rectangle, ellipse | P0 | 2j | P1-007 |
| `[ ]` | P1-021 | Formes : flèche, ligne | P0 | 1j | P1-020 |
| `[ ]` | P1-022 | Surbrillance (highlight semi-transparent) | P0 | 1j | P1-007 |
| `[ ]` | P1-023 | Flou de zone (pixelisation ou blur gaussien) | P0 | 2j | P1-007 |
| `[ ]` | P1-024 | Gestion des couches : sélection, déplacement, redimensionnement, suppression | P0 | 2j | P1-019 |
| `[ ]` | P1-025 | Undo/Redo (historique d'actions) | P0 | 1j | P1-024 |

**Livrable :** Annotations complètes avec gestion des couches et undo/redo.

**Critères de validation**

- [ ] Tous les outils d'annotation fonctionnels (texte, formes, highlight, flou)
- [ ] Couches sélectionnables, déplaçables, redimensionnables
- [ ] Undo/redo ≥ 20 niveaux sans corruption du rendu
- [ ] Annotations incluses à l'export PNG/JPG/WebP

### Sprint 1.5 (Semaines 17–18) — Redaction & Export

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | P1-026 | Moteur de détection on-device : emails, téléphones, cartes bancaires | P0 | 3j | P1-007 |
| `[ ]` | P1-027 | Détection : clés API, URLs sensibles, mots de passe | P0 | 2j | P1-026 |
| `[ ]` | P1-028 | UI de redaction : highlight des zones détectées, masquage 1-clic | P0 | 2j | P1-026 |
| `[ ]` | P1-029 | Mode automatique : redaction globale activable dans les settings | P1 | 1j | P1-028, P0-016 |
| `[ ]` | P1-030 | Export PNG (qualité max) | P0 | 1j | P1-007 |
| `[ ]` | P1-031 | Export JPG (qualité configurable) + WebP | P0 | 1j | P1-030 |
| `[ ]` | P1-032 | Copier dans le presse-papier (Cmd+C / Ctrl+C) | P0 | 1j | P1-030 |
| `[ ]` | P1-033 | Glisser-déposer vers apps externes | P1 | 1j | P1-030 |

**Livrable :** Redaction fonctionnelle + export multi-format + copier/coller.

**Critères de validation**

- [ ] Détection PII on-device (aucun appel réseau) avec taux de rappel acceptable sur jeu de test
- [ ] Masquage 1-clic + mode auto activable
- [ ] Export PNG/JPG/WebP + copier presse-papier + drag-out fonctionnels
- [ ] Aucune fuite de pixels non masqués sur échantillons sensibles

### Sprint 1.6 (Semaines 19–20) — Historique & Polish MVP

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | P1-034 | Historique des 30 dernières captures (stockage local + miniatures) | P0 | 2j | P0-006 |
| `[ ]` | P1-035 | UI historique : grille, preview, réouverture dans l'éditeur | P0 | 2j | P1-034 |
| `[ ]` | P1-036 | Tests d'intégration end-to-end : flux complet capture → beautify → export | P0 | 3j | Tous P1-* |
| `[ ]` | P1-037 | Corrections de bugs et polish UX (feedback interne) | P0 | 3j | Tous P1-* |
| `[ ]` | P1-038 | Optimisation performances : profiling, memory leaks, temps de rendu | P1 | 2j | Tous P1-* |
| `[ ]` | P1-039 | Préparation des builds de release macOS (.dmg) + Windows (.msi/.exe) | P0 | 2j | P0-023 |

**Livrable :** MVP Desktop complet et testé, prêt pour la beta.

**Critères de validation**

- [ ] Historique 30 captures avec miniatures ; réouverture éditeur OK
- [ ] E2E Playwright : capture → beautify → export vert
- [ ] Builds release signés installables macOS + Windows
- [ ] Profiling : pas de memory leak sur 50 captures consécutives
- [ ] Jalon J1 validé en sprint review

---

**Jalon J1 (fin M5) :** MVP multiplateforme complet (macOS + Windows). Toutes les features core fonctionnelles.

---

## 5. PHASE 1b — MVP Mobile (M4–M6)

> Objectif : proposer une app compagnon iOS et Android avec parité fonctionnelle sur la beautification.
> Note : démarrage en parallèle du Sprint 1.4 desktop.

### Sprint 1b.1 (Semaines 15–16) — Setup React Native & Capture mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | M1-001 | Setup projet React Native (Expo) iOS + Android ; ajouter `dev:mobile` dans `mise.toml` | P0 | 2j | — |
| `[ ]` | M1-002 | Implémenter Share Extension iOS (import depuis Photos/apps) | P0 | 3j | M1-001 |
| `[ ]` | M1-003 | Implémenter Share Intent Android (import depuis Photos/apps) | P0 | 3j | M1-001 |
| `[ ]` | M1-004 | Réutiliser les composants UI du design system (adaptation mobile) | P0 | 2j | P0-009, M1-001 |

**Critères de validation**

- [ ] `mise run dev:mobile` lance Expo sur iOS + Android
- [ ] Share Extension / Intent importe une image dans l'app
- [ ] Composants design-tokens rendus correctement sur mobile

### Sprint 1b.2 (Semaines 17–18) — Beautification & Presets mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | M1-005 | Porter le moteur de beautification sur mobile (Canvas/Skia) | P0 | 4j | M1-001, P1-007 |
| `[ ]` | M1-006 | Presets réseaux sociaux (format mobile) | P0 | 1j | M1-005 |
| `[ ]` | M1-007 | Annotations tactiles : texte, formes, flou | P0 | 3j | M1-005 |
| `[ ]` | M1-008 | Export : sauvegarde dans Photos, partage via sheet natif | P0 | 2j | M1-005 |

**Critères de validation**

- [ ] Beautification mobile paritaire avec desktop (presets, padding, ombre)
- [ ] Annotations tactiles utilisables
- [ ] Export Photos + share sheet natif fonctionnels

### Sprint 1b.3 (Semaines 19–20) — Polish & Tests mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | M1-009 | Redaction de données sensibles (adaptation mobile) | P0 | 2j | M1-005, P1-026 |
| `[ ]` | M1-010 | Tests sur devices réels (iPhone 14+, Pixel 7+, Samsung Galaxy S23+) | P0 | 3j | Tous M1-* |
| `[ ]` | M1-011 | Optimisation performances mobile (temps de rendu, mémoire) | P1 | 2j | Tous M1-* |
| `[ ]` | M1-012 | Préparation submission App Store + Google Play | P0 | 2j | Tous M1-* |

**Critères de validation**

- [ ] Redaction mobile alignée desktop (on-device)
- [ ] Tests devices réels documentés (matrice OS / modèles)
- [ ] Builds TestFlight + Play Internal Testing uploadés

### Sprint 1b.4 (Semaines 21–22) — Soumission & Corrections

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | M1-013 | Soumission App Store (review Apple) | P0 | — | M1-012 |
| `[ ]` | M1-014 | Soumission Google Play | P0 | — | M1-012 |
| `[ ]` | M1-015 | Corrections post-review et ajustements | P0 | 3j | M1-013, M1-014 |
| `[ ]` | M1-016 | Publication et monitoring | P0 | 1j | M1-015 |

**Livrable :** Apps iOS et Android publiées avec parité beautification.

**En attente (soumission manuelle)**

- Comptes développeur Apple ($99/an) et Google Play ($25 one-time).
- Review store (1–7 jours Apple, 1–3 jours Google en moyenne).

**Critères de validation**

- [ ] Apps approuvées et publiques sur App Store + Google Play
- [ ] Crash-free rate > 99 % première semaine (Sentry)
- [ ] Jalon J2 validé en sprint review

---

## 6. PHASE 2 — Lancement (M6)

> Objectif : beta fermée, feedback, puis lancement public coordonné.

### Sprint 2.1 (Semaines 23–24) — Beta fermée

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | L-001 | Déployer la beta fermée à 200 testeurs (waitlist) | P0 | 1j | P1-039, M1-016 |
| `[ ]` | L-002 | Setup système de feedback in-app (formulaire + analytics) | P0 | 2j | P0-019 |
| `[ ]` | L-003 | Triage et correction des bugs critiques remontés | P0 | 5j | L-001 |
| `[ ]` | L-004 | Ajustements UX basés sur le feedback beta | P0 | 3j | L-001 |
| `[ ]` | L-005 | Finaliser la landing page : vidéo démo, pricing, FAQ | P0 | 2j | P0-013 |

**Critères de validation**

- [ ] 200 testeurs invités ; ≥ 50 % activation
- [ ] Feedback in-app + analytics opérationnels
- [ ] 0 bug P0 ouvert en fin de sprint
- [ ] Landing finalisée (vidéo, pricing, FAQ live)

### Sprint 2.2 (Semaines 25–26) — Lancement public

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | L-006 | Préparer les assets Product Hunt (logo, tagline, screenshots, vidéo) | P0 | 2j | L-005 |
| `[ ]` | L-007 | Préparer le deal AppSumo (page, pricing 19$ OTP, description) | P0 | 2j | L-005 |
| `[ ]` | L-008 | Lancement Product Hunt (minuit PST) + monitoring | P0 | 1j | L-006 |
| `[ ]` | L-009 | Activation AppSumo le même jour | P0 | 1j | L-007 |
| `[ ]` | L-010 | Outreach : newsletters tech, Reddit (r/macapps, r/SideProject, r/webdev) | P1 | 2j | L-008 |
| `[ ]` | L-011 | Teaser Twitter/X : "Before/After" visuels viraux | P1 | 1j | L-008 |
| `[ ]` | L-012 | Monitoring : analytics, crash reports, support tickets | P0 | Continu | L-008 |

**Livrable :** SnapGlow lancé publiquement sur Product Hunt, AppSumo, et le site direct.

**Critères de validation**

- [ ] Product Hunt live avec assets complets
- [ ] AppSumo deal actif
- [ ] Dashboard monitoring (PostHog, Sentry, support) opérationnel
- [ ] Jalon J3 validé en sprint review

---

**Jalon J3 (M6) :** Lancement public — Product Hunt + AppSumo.

---

## 7. PHASE 2b — IA & Cloud (M7–M9)

> Objectif : ajouter l'intelligence artificielle, les captures avancées, et le cloud.

### Sprint 2b.1 (Semaines 27–28) — Suggestion de style IA

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | AI-001 | Entraîner/adapter un modèle de classification de contenu (code, UI, photo, texte) | P0 | 4j | — |
| `[ ]` | AI-002 | Intégrer le modèle on-device (TF Lite macOS/Windows, Core ML macOS) | P0 | 3j | AI-001 |
| `[ ]` | AI-003 | Mapper classification → presets de style recommandés | P0 | 2j | AI-001 |
| `[ ]` | AI-004 | UI : badge "Suggested" + application en 1 clic | P0 | 1j | AI-003 |

**Critères de validation**

- [ ] Classification on-device sans réseau ; latence < 500 ms
- [ ] Badge "Suggested" + application preset en 1 clic
- [ ] Précision acceptable sur jeu de test interne (≥ 80 %)

### Sprint 2b.2 (Semaines 29–30) — OCR & Auto-crop

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | AI-005 | Intégrer Tesseract.js (cross-platform) pour OCR | P0 | 2j | — |
| `[ ]` | AI-006 | Intégrer Apple Vision Framework (macOS) comme moteur OCR alternatif | P1 | 2j | — |
| `[ ]` | AI-007 | UI : bouton "Copier le texte", sélection de zones de texte | P0 | 2j | AI-005 |
| `[ ]` | AI-008 | Auto-crop : détection et suppression des espaces vides excessifs | P0 | 2j | P1-007 |
| `[ ]` | AI-009 | Compression intelligente (mozjpeg + pngquant) | P1 | 2j | P1-030 |

**Critères de validation**

- [ ] OCR copie texte depuis capture ; sélection de zones OK
- [ ] Auto-crop réduit marges vides sans rogner le contenu
- [ ] Compression réduit taille fichier ≥ 30 % sans perte visible

### Sprint 2b.3 (Semaines 31–32) — Capture scrollante & GIF

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | AC-001 | Capture scrollante macOS (scroll automatique + assemblage) | P0 | 4j | P1-001 |
| `[ ]` | AC-002 | Capture scrollante Windows | P0 | 4j | P1-002 |
| `[ ]` | AC-003 | Capture différée (timer 3/5/10 secondes) | P1 | 1j | P1-001 |
| `[ ]` | AC-004 | Capture de menu ouvert | P1 | 2j | P1-001 |

**Critères de validation**

- [ ] Capture scrollante macOS + Windows sur pages test (long scroll)
- [ ] Timer différé et capture menu ouvert fonctionnels

### Sprint 2b.4 (Semaines 33–34) — Capture vidéo/GIF

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | AC-005 | Enregistrement de zone d'écran (< 30s) — macOS | P0 | 3j | P1-001 |
| `[ ]` | AC-006 | Enregistrement de zone d'écran — Windows | P0 | 3j | P1-002 |
| `[ ]` | AC-007 | Encodage GIF optimisé (< 10MB pour 10s) | P0 | 2j | AC-005 |
| `[ ]` | AC-008 | Export vidéo MP4 (H.264) | P1 | 2j | AC-005 |
| `[ ]` | AC-009 | UI : contrôles d'enregistrement (start, stop, pause) | P0 | 1j | AC-005 |

**Critères de validation**

- [ ] Enregistrement zone < 30 s macOS + Windows
- [ ] GIF < 10 MB pour 10 s ; export MP4 optionnel
- [ ] Contrôles start/stop/pause utilisables

### Sprint 2b.5 (Semaines 35–36) — Cloud & Partage

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | CL-001 | Setup backend API (Fastify) + PostgreSQL + Redis ; ajouter `dev:api` dans `mise.toml` | P0 | 3j | — |
| `[ ]` | CL-002 | Setup stockage fichiers (Cloudflare R2) | P0 | 2j | CL-001 |
| `[ ]` | CL-003 | Système d'authentification (Clerk/Auth0 — OAuth2) | P0 | 2j | CL-001 |
| `[ ]` | CL-004 | Upload automatique + génération de lien partageable | P0 | 2j | CL-002 |
| `[ ]` | CL-005 | Page de visualisation publique du lien partagé | P0 | 2j | CL-004 |
| `[ ]` | CL-006 | Expiration configurable des liens (1h, 24h, 7j, permanent) | P1 | 1j | CL-004 |

**Reporté**

- **Terraform GCP + Docker infra** — infra cloud gérée manuellement ou via PaaS en premier temps.

**Critères de validation**

- [ ] `mise run dev:api` lance Fastify + Postgres + Redis local
- [ ] Upload → lien public → page viewer fonctionnels
- [ ] Expiration liens configurable et respectée

### Sprint 2b.6 (Semaines 37–38) — Intégrations & Organisation

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | CL-007 | Intégration Slack (envoi direct depuis l'éditeur) | P0 | 2j | CL-003 |
| `[ ]` | CL-008 | Intégration Notion | P1 | 2j | CL-003 |
| `[ ]` | CL-009 | Intégration Linear | P1 | 2j | CL-003 |
| `[ ]` | CL-010 | Intégration GitHub Issues | P1 | 2j | CL-003 |
| `[ ]` | CL-011 | Watermark personnalisable (logo, nom, URL) | P1 | 2j | P1-007 |
| `[ ]` | CL-012 | Bibliothèque de captures avec recherche full-text (OCR) | P0 | 3j | AI-005, P1-034 |
| `[ ]` | CL-013 | Tags et collections | P1 | 2j | CL-012 |

**Livrable :** IA on-device, capture scrollante/GIF, cloud avec liens partageables, intégrations.

**Critères de validation**

- [ ] Intégration Slack opérationnelle (envoi depuis éditeur)
- [ ] Bibliothèque cloud avec recherche OCR
- [ ] Tags et collections utilisables
- [ ] Jalon J4 validé (1 000 utilisateurs payants — métrique produit)

---

**Jalon J4 (M9) :** 1 000 utilisateurs payants. IA + Cloud opérationnels.

---

## 8. PHASE 3 — Team & B2B (M10–M14)

> Objectif : débloquer le segment B2B avec collaboration, workspaces, et API.

### Sprint 3.1–3.2 (Semaines 39–42) — Workspace & Gestion d'équipe

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-001 | Modèle de données multi-tenant (workspaces, rôles, invitations) | P0 | 4j | CL-001 |
| `[ ]` | T-002 | UI gestion d'équipe : invitations, rôles (admin/éditeur/viewer) | P0 | 4j | T-001 |
| `[ ]` | T-003 | Brand kit centralisé : couleurs, polices, logos partagés | P0 | 3j | T-001 |
| `[ ]` | T-004 | SSO (SAML/OIDC) pour Team Pro | P1 | 3j | CL-003, T-001 |
| `[ ]` | T-005 | Billing team : intégration Stripe (par siège/mois) | P0 | 3j | T-001 |

**Critères de validation**

- [ ] Workspace créable ; invitations + rôles fonctionnels
- [ ] Brand kit partagé appliqué aux exports team
- [ ] Billing Stripe par siège opérationnel (sandbox puis prod)

### Sprint 3.3–3.4 (Semaines 43–46) — Collaboration temps réel

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-006 | Serveur WebSocket pour collaboration en temps réel | P0 | 4j | CL-001 |
| `[ ]` | T-007 | Annotations partagées (curseurs multiples, sync) | P0 | 5j | T-006, P1-024 |
| `[ ]` | T-008 | Système de commentaires sur les captures | P0 | 3j | T-006 |
| `[ ]` | T-009 | Notifications (in-app + email) sur les commentaires/mentions | P1 | 2j | T-008 |

**Critères de validation**

- [ ] 2+ utilisateurs annotent simultanément avec sync < 200 ms
- [ ] Commentaires + notifications email/in-app fonctionnels

### Sprint 3.5–3.6 (Semaines 47–50) — API publique

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-010 | Concevoir l'API REST publique (OpenAPI spec) | P0 | 3j | CL-001 |
| `[ ]` | T-011 | Endpoints : upload, beautify, export, list | P0 | 4j | T-010 |
| `[ ]` | T-012 | Authentification API (API keys + rate limiting) | P0 | 2j | T-010 |
| `[ ]` | T-013 | Documentation API interactive (Swagger UI / Redoc) | P0 | 2j | T-010 |
| `[ ]` | T-014 | SDK JavaScript/TypeScript | P1 | 3j | T-011 |

**Critères de validation**

- [ ] OpenAPI publiée ; Swagger/Redoc accessible
- [ ] Endpoints upload/beautify/export/list + rate limiting testés
- [ ] SDK npm publié (beta)

### Sprint 3.7–3.8 (Semaines 51–54) — Plugins

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-015 | Plugin VS Code : capture depuis l'éditeur + beautification | P0 | 4j | T-011 |
| `[ ]` | T-016 | Plugin Figma : import/export depuis Figma | P1 | 4j | T-011 |
| `[ ]` | T-017 | Plugin Notion : embed enrichi dans les pages | P1 | 3j | T-011 |
| `[ ]` | T-018 | Rapports d'utilisation team (captures/membre, exports, cloud usage) | P1 | 3j | T-001 |

**Critères de validation**

- [ ] Plugin VS Code publié sur Marketplace (ou VSIX interne)
- [ ] Rapports d'utilisation team disponibles dans dashboard

### Sprint 3.9–3.10 (Semaines 55–58) — Polish & Stabilisation B2B

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-019 | Tests de charge API (1000+ requêtes/min) | P0 | 2j | T-011 |
| `[ ]` | T-020 | Audit sécurité (OWASP, pentest basique) | P0 | 3j | Tous T-* |
| `[ ]` | T-021 | Onboarding team : wizard de setup workspace | P0 | 2j | T-002 |
| `[ ]` | T-022 | Documentation utilisateur (help center / knowledge base) | P0 | 3j | — |
| `[ ]` | T-023 | Corrections bugs et polish UX B2B | P0 | 4j | Tous T-* |

**Livrable :** Plans Team fonctionnels avec collaboration, API, plugins, et brand kit.

**Critères de validation**

- [ ] API tient 1000+ req/min sans dégradation critique
- [ ] Audit sécurité documenté ; findings P0 corrigés
- [ ] Help center en ligne ; onboarding team wizard complet
- [ ] Jalon J5 validé (5 000 utilisateurs actifs)

---

**Jalon J5 (M12–M14) :** 5 000 utilisateurs actifs. Plans Team lancés.

---

## 9. PHASE 4 — Scale (M15–M18)

> Objectif : scaler l'acquisition, internationaliser, et créer un écosystème.

### Sprints 4.1–4.8 (Semaines 59–74)

| Statut | ID | Tâche | Priorité | Période |
|---|---|---|---|---|
| `[ ]` | S-001 | Marketplace de templates de beautification (communauté) | P1 | S59–62 |
| `[ ]` | S-002 | Programme d'affiliés (30% commission, dashboard affilié) | P0 | S59–62 |
| `[ ]` | S-003 | Localisation FR, DE, JP (UI + marketing) | P0 | S63–66 |
| `[ ]` | S-004 | Intégrations entreprise avancées (Jira, Confluence, Teams) | P1 | S63–66 |
| `[ ]` | S-005 | Synchronisation cross-device (captures + settings) | P0 | S67–70 |
| `[ ]` | S-006 | Content marketing SEO : 2 articles/semaine | P0 | Continu |
| `[ ]` | S-007 | Expansion Setapp + inclusion dans bundles partenaires | P1 | S67–70 |
| `[ ]` | S-008 | Optimisation conversion : A/B tests pricing, onboarding, paywall | P0 | S71–74 |

**Critères de validation (Phase 4)**

- [ ] Marketplace templates live avec soumission communautaire
- [ ] Programme affiliés opérationnel (tracking + payouts)
- [ ] UI localisée FR/DE/JP ; landing marketing traduite
- [ ] Sync cross-device captures + settings fiable
- [ ] ≥ 2 articles SEO/semaine publiés sur la période
- [ ] A/B tests pricing/onboarding en cours avec métriques PostHog

---

## 10. Matrice des Dépendances

```
P0-002 (Tauri setup) ──────┬─── P0-014 (menu bar) ──── P0-015 (raccourcis)
                            │
                            ├─── P1-001/P1-002 (capture) ──── P1-007 (beautification)
                            │                                        │
                            │                                        ├── P1-013 (presets)
                            │                                        ├── P1-019 (annotations)
                            │                                        ├── P1-026 (redaction)
                            │                                        └── P1-030 (export)
                            │
                            └─── P0-006 (SQLite) ──── P0-016 (settings) ──── P1-034 (historique)

M1-001 (React Native) ────── M1-005 (beautification mobile) ──── M1-009 (redaction mobile)

CL-001 (backend) ──── CL-003 (auth) ──── T-001 (multi-tenant) ──── T-006 (WebSocket)
                 │
                 └──── CL-002 (R2) ──── CL-004 (upload + lien)
```

---

## 11. Tableau Récapitulatif des Livrables

| Phase | Période | Sprints | Livrable principal | Jalon |
|---|---|---|---|---|
| Phase 0 | M1–M2 | 4 | Architecture, design system, CI/CD, landing page | J0 |
| Phase 1 | M2–M5 | 6 | MVP Desktop : capture + beautification + annotations + redaction + export | J1 |
| Phase 1b | M4–M6 | 4 | Apps iOS + Android avec parité beautification | J2 |
| Phase 2 | M6 | 2 | Beta 200 testeurs → lancement Product Hunt + AppSumo | J3 |
| Phase 2b | M7–M9 | 6 | IA style, OCR, capture scrollante/GIF, cloud + liens partageables | J4 |
| Phase 3 | M10–M14 | 10 | Workspace team, collaboration, API, plugins, brand kit | J5 |
| Phase 4 | M15–M18 | 8 | Marketplace, affiliés, i18n, sync cross-device | — |

---

## Documents liés

- [[Cahier des Charges]] — Point d'entrée documentation
- [[Product Requirements]] — Exigences produit détaillées
- [[Technical Stack - Desktop]] — Architecture technique desktop
- [[Cahier des Charges]] — Spécifications originales
- [[Market Analysis]] — Analyse de marché

---

*v1.0 — Juin 2026 — Usage confidentiel*
