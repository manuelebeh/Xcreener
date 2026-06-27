# Sprints & Implementations - SnapGlow

> Plan de développement détaillé, sprints, livrables et dépendances
> **Version :** 1.0 | **Date :** Juin 2026 | **Statut :** Brouillon

← [[Product Requirements]] | → [[Technical Stack - Desktop]]

---

## 1. Méthodologie

- **Sprints de 2 semaines** (lundi → vendredi de la semaine suivante)
- **Cérémonies** : Sprint Planning (lundi S1), Daily standup, Sprint Review + Retro (vendredi S2)
- **Outil de suivi** : Linear (ou GitHub Projects)
- **Branches** : `main` (production), `develop` (intégration), `feature/*`, `fix/*`
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …) - Husky + Commitlint en Sprint 0.1 ; **migration vers hooks mise** dès Sprint 0.2 (`apps/web`)
- **Monorepo** : `mise` (porte d'entrée dev + pin toolchains) + **Turborepo** (cache/build packages TS) - pattern inspiré de [fullstack-starter](https://github.com/first-fluke/fullstack-starter), stack SnapGlow propre (Tauri, Expo, Fastify - pas Flutter/FastAPI/GCP)
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
├── desktop/     # Tauri v2 - macOS + Windows        (Phase 0–1)
├── web/         # Landing + viewer partage /s/:token (Sprint 0.2, 2b.5)
├── mobile/      # React Native Expo - iOS + Android  (Phase 1b)
└── api/         # Fastify + PostgreSQL + Redis       (Phase 2b)
packages/
├── design-tokens/          # SSOT couleurs, spacing (Sprint 0.2) + tokens.native (Sprint 1b.1)
├── ui/                     # Composants React web + Storybook (Sprint 0.2)
├── ui-native/              # Composants React Native (Sprint 1b.1)
├── editor-core/            # Layout, presets, annotations (Sprint 1b.2+)
├── redaction-core/         # Détecteurs on-device (Sprint 1.5 / 1b.3)
├── style-suggestion-core/  # Classification contenu → style (Sprint 2b.1)
├── ocr-core/               # Types OCR + assembly texte (Sprint 2b.2)
├── cloud-core/             # Shares, expiry, library types (Sprint 2b.5)
├── integrations-core/      # Providers OAuth Send to… (Sprint 2b.6)
├── team-core/              # Rôles workspace, plans, brand kit (Sprint 3.1–3.2)
├── biome-config/           # Biome partagé (Sprint 0.1)
├── typescript-config/
└── i18n/                   # SSOT traductions (Phase 4, planifié)
```

**Commandes dev (via mise) :** `mise run dev:desktop` → `mise run dev:web` → `mise run dev:mobile` → `mise run dev:api` (ajoutées au fil des phases).

---

## 2. Vue d'ensemble des phases

```
PHASE 0 - Fondations          M1–M2     (4 sprints)     Architecture & Setup
PHASE 1 - MVP Desktop         M2–M5     (6 sprints)     Core macOS + Windows
PHASE 1b - MVP Mobile         M4–M6     (4 sprints)     iOS + Android
PHASE 2 - Lancement           M6        (2 sprints)     Beta + Product Hunt
PHASE 2b - IA & Cloud         M7–M9     (6 sprints)     Intelligence + Cloud
PHASE 3 - Team & B2B          M10–M14   (10 sprints)    Collaboration + API
PHASE 4 - Scale               M15–M18   (8 sprints)     Marketplace + i18n
```

**Total estimé : ~40 sprints sur 18 mois**

---

## 3. PHASE 0 - Fondations (M1–M2)

> Objectif : poser l'architecture technique, le design system, et l'infrastructure de développement.

### Sprint 0.1 (Semaines 1–2) - Setup & Architecture

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-15) | P0-001 | Initialiser monorepo (Turborepo + pnpm) + `mise.toml` (toolchains + tasks racine `dev:*`, `lint`, `install`) | P0 | 2j | - |
| `[x]` (2026-06-15) | P0-002 | Setup Tauri v2 - projet skeleton macOS + Windows | P0 | 3j | P0-001 |
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

> **Inspiration [fullstack-starter](https://github.com/first-fluke/fullstack-starter)** - patterns DX monorepo multi-apps, stack SnapGlow distincte.

| Élément | Quand | Décision SnapGlow |
|---|---|---|
| Monorepo `apps/` + `packages/` | Sprint 0.1 | **Adopter** |
| **mise tasks racine** (`dev:desktop`, `lint`, `install`…) | Sprint 0.1 | **Adopter** - porte d'entrée dev unique |
| **Turborepo** (cache/build TS) | Sprint 0.1 | **Adopter** - sous-jacent à mise pour packages JS |
| Biome + Commitlint | Sprint 0.1 | **Adopter** |
| **Husky** git hooks | Sprint 0.1 | **Adopter** (temporaire) |
| **Hooks mise conditionnels** (lint par app) | Sprint 0.2 | **Adopter** - remplace Husky (P0-025) |
| `AGENTS.md` + `.agents/rules/` | Sprint 0.1 | **Adopter** |
| CodeGraph MCP | Sprint 0.1 | **Adopter** (pas Serena) |
| `packages/design-tokens` | Sprint 0.2 | **Adopter** (P0-009) |
| `apps/web` landing **TanStack Start** + VPS | Sprint 0.2 | **Adopter** (P0-013) |
| `apps/mobile` **Expo / React Native** | Phase 1b | **Adopter** (M1-001, 2026-06-20) |
| `apps/api` **Fastify** + PostgreSQL | Phase 2b | **Adopter** (CL-001) |
| Release Please + CHANGELOG | Sprint 0.4+ | **Reporter** |
| Terraform GCP + Docker infra | Phase 2b+ | **Reporter** |
| oh-my-agent | - | **Ne pas adopter** |

### Sprint 0.2 (Semaines 3–4) - Design System & Prototype

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | P0-008 | Créer le design system Figma (couleurs, typographie, composants) | P0 | 3j | - |
| `[x]` (2026-06-16) | P0-009 | Implémenter les composants UI de base (React + Tailwind) : boutons, inputs, sliders, tooltips, dropdowns - `packages/design-tokens` (pattern fullstack-starter) | P0 | 4j | P0-002, P0-007 |
| `[ ]` | P0-010 | Créer le prototype interactif Figma du flux principal | P0 | 3j | P0-008 |
| `[x]` (2026-06-16) | P0-011 | Configurer Storybook pour la bibliothèque de composants | P1 | 1j | P0-009 |
| `[x]` (2026-06-16) | P0-012 | Implémenter le thème Light/Dark/System | P1 | 2j | P0-009 |
| `[x]` (2026-06-16) | P0-013 | Créer la landing page (`apps/web` - **TanStack Start** + VPS, pas Next.js) | P1 | 3j | P0-008 |
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
- [ ] `apps/web` déployé sur VPS (URL publique) - **reporté** ; `mise run dev:web` opérationnel
- [x] `mise run dev:web` et `mise run tokens:build` opérationnels
- [x] Husky retiré ; hooks mise actifs (lint-staged + commitlint)

### Sprint 0.3 (Semaines 5–6) - Infrastructure & Intégration système

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

- **Tray / menu bar** : `src-tauri/src/tray.rs` - icône, toggle show/hide, menu Open / Settings / Quit ; fermeture fenêtre → hide
- **Raccourcis globaux** : `tauri-plugin-global-shortcut` + `update_capture_shortcut` ; ouverture overlay capture (`show_capture_overlay`)
- **Settings SQLite** : `theme`, `captureShortcut`, `launchAtLogin`, `analyticsEnabled` ; UI Settings enrichie (`@snapglow/ui`)
- **Auto-start** : `tauri-plugin-autostart` + sync bootstrap / toggle Settings
- **Tests** : Vitest (`store.test.ts`, validation raccourcis) ; Playwright smoke (`e2e/settings.spec.ts`) ; `mise run test` + step CI
- **Observabilité** : PostHog + Sentry desktop (`integrations/observability.ts`) - actif en dev si clés env, opt-in prod ; `apps/desktop/.env.example`

**Critères de validation**

- [x] Icône menu bar / system tray visible ; fenêtre show/hide au clic
- [x] Raccourci global configurable ouvre l'overlay de capture
- [x] Settings complets persistés en SQLite (au-delà du thème)
- [x] Auto-start activable/désactivable dans les préférences
- [x] Vitest + au moins 1 test unitaire ; Playwright smoke test configuré
- [x] PostHog + Sentry initialisés (events de test visibles en dashboard avec `VITE_POSTHOG_KEY` / `VITE_SENTRY_DSN` en `.env`)

### Sprint 0.4 (Semaines 7–8) - Polissage Phase 0 & Préparation Phase 1

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P0-020 | Audit qualité du design system - ajustements accessibilité (WCAG AA) | P0 | 2j | P0-009 |
| `[x]` (2026-06-16) | P0-021 | Documentation architecture (ADRs - Architecture Decision Records) | P1 | 2j | P0-005 |
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

- **Release Please + CHANGELOG** - début Phase 1
- **Builds signés macOS/Windows** - en attente certificats (pipeline prêt)
- **Release test `v0.1.0-test`** - nécessite secret `TAURI_SIGNING_PRIVATE_KEY` sur GitHub + tag manuel

**Critères de validation**

- [x] Audit accessibilité WCAG AA documenté avec corrections appliquées
- [x] ADRs complémentaires rédigés (capture, IPC, updater…)
- [x] Tauri updater configuré (canal de release test via GitHub Releases)
- [~] Builds signés macOS + Windows - **scaffolding CI** ; artefacts non signés OK (certs à provisionner)
- [x] Tests menu bar + raccourcis (Rust + native e2e Linux/Windows CI ; macOS = Rust tests + QA manuelle tray)
- [x] Jalon J0 validé en sprint review

---

**Jalon J0 (fin M2) :** Projet skeleton fonctionnel, design system, CI/CD, landing page.

---

## 4. PHASE 1 - MVP Desktop (M2–M5)

> Objectif : livrer les fonctionnalités core de capture + beautification sur macOS et Windows.

### Sprint 1.1 (Semaines 9–10) - Capture d'écran native

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-001 | Implémenter la capture de zone (sélection libre) - macOS | P0 | 3j | P0-015 |
| `[x]` (2026-06-20) | P1-002 | Implémenter la capture de zone - Windows (Graphics Capture API) | P0 | 3j | P0-015 |
| `[x]` (2026-06-16) | P1-003 | Implémenter la capture de fenêtre (détection auto des bords) - macOS | P0 | 2j | P1-001 |
| `[x]` (2026-06-20) | P1-004 | Implémenter la capture de fenêtre - Windows | P0 | 2j | P1-002 |
| `[x]` (2026-06-20) | P1-005 | Implémenter la capture plein écran - macOS + Windows | P0 | 1j | P1-001, P1-002 |
| `[x]` (2026-06-16) | P1-006 | Tests capture sur multi-écran (display scaling, HiDPI) | P0 | 2j | P1-001, P1-002 |

**Livrable :** Capture fonctionnelle (zone, fenêtre, plein écran) sur macOS et Windows.

**Livré (code + QA macOS, 2026-06-16 ; parité Windows validée, 2026-06-20)**

- **Backend Rust** : module `src-tauri/src/capture/` (`xcap`) - preview bureau, listage moniteurs/fenêtres, `get_window_at_point`, commandes `capture_*` + validation bornes
- **Fenêtre overlay** : webview dédiée `capture-overlay` ; snapshot `capture_desktop_preview` avant affichage ; event `capture-overlay-init` (bounds, moniteurs, PNG preview)
- **UI capture** : `CaptureOverlay` - modes Region / Window / Screen ; barre d’outils ; surbrillance fenêtre (`WindowHighlight`) et écran (`MonitorHighlight`)
- **UX confirmée** : pas de capture automatique au changement de mode ; Region = sélection puis bouton **Capture** / Entrée ; Window / Screen = survol + clic (ou **Capture** pour Screen) ; découpe client depuis l’aperçu figé (pas de seconde capture native, pas d’overlay « Capturing… »)
- **Pipeline éditeur** : event `capture-image` → `useCaptureSession` → `setScreenshot` + navigation accueil
- **Tests** : Rust (`capture/mod.rs`, `validate.rs`) ; Vitest (`store.test.ts`, `image.test.ts`, `captureCursors.test.ts`) ; e2e native overlay visible (`integration.spec.ts`)

**En attente / reporté**

- **Commandes natives `capture_*` au confirm** - conservées côté Rust pour tests et usages futurs ; le flux overlay utilise la découpe preview (ADR-006)

**Critères de validation**

- [x] Capture zone, fenêtre et plein écran fonctionnelles sur macOS (QA manuelle validée)
- [x] Parité Windows pour les 3 modes de capture (QA manuelle validée, 2026-06-20)
- [x] Tests multi-écran / HiDPI passent sur au moins 2 configurations (QA macOS validée ; scale overlay Windows validé en QA manuelle, 2026-06-20)
- [x] Image capturée affichée dans l'éditeur (pipeline bout-en-bout minimal)

### Sprint 1.2 (Semaines 11–12) - Beautification automatique

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

- **Moteur Canvas 2D** : `modules/editor/engine/` - `computeLayout`, `drawBackground`, `drawShadow`, `drawScreenshot`, `renderFrame` ; composition 3 couches (fond → ombre → capture clipée) ; HiDPI via `devicePixelRatio`
- **Store éditeur** : `background`, `padding`, `borderRadius`, `shadow` ; defaults auto à chaque `setScreenshot` (dégradé SnapGlow, padding ~12 %, radius 12 px, ombre douce)
- **56 presets dégradés** : `engine/gradients.ts` (dont brand warm linen `#f2ece4` → `#ddd4c8`, id `snapglow-brand`)
- **UI minimale** : `BeautifyPanel` - onglets Gradient / Solid / Image, grille presets, sliders padding / radius / shadow, color pickers, upload image (`<input type="file">`)
- **Canvas WYSIWYG** : `useBeautifyRender` (rAF) ; preview composée = source de vérité pour l’export (Sprint 1.5 - `renderToExportCanvas`)
- **Tests** : Vitest - `computeLayout`, `gradients` (≥ 50), `drawBackground`, `renderFrame`, `store`

**En attente / reporté**

- **StyleBar inline polie** (P1-017, Sprint 1.3) - `BeautifyPanel` couvre les contrôles fonctionnels du sprint
- **Profiling perf formel** (< 50–100 ms par frame) - reporté P1-038 ; rendu rAF thread principal suffisant en QA manuelle

**Critères de validation**

- [x] Canvas rend fond + capture + ombre en temps réel (rAF ; cible < 100 ms - profiling formel en P1-038)
- [x] ≥ 50 presets dégradés disponibles (56)
- [x] Padding, radius et ombre ajustables via UI (`BeautifyPanel`)
- [x] Fond couleur custom + image upload fonctionnels

### Sprint 1.3 (Semaines 13–14) - Presets, Format & Éditeur inline

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

- **Moteur cadre** : `engine/presets.ts` - 5 presets sociaux + ratios 16:9 / 4:3 / 1:1 / libre ; `computeLayout` v2 (mode libre inchangé + dimensions export fixes) ; `ScreenshotTransform` (scale + offset)
- **Interaction** : `useScreenshotTransform` - drag pointeur + molette zoom (0.5×–3×) sur le canvas
- **Presets custom SQLite** : `db/presets.ts` CRUD sur `custom_presets` ; hydratation via `useCustomPresetsLoader`
- **UI inline** : `EditorView` - Feature Stack (`Canvas` sticky gauche + `EditorToolsPanel` droite) ; sections Format (`PresetBar`) puis Style (`StyleBar`, ex-`BeautifyPanel`, carrousel dégradés, shadow offsetX)
- **Export prep** : `export/utils/canvasExport.ts` - `canvasToPngBlob` + dimensions bitmap
- **Tests** : Vitest - `presets`, `computeLayout` (cadre), `store` (preset), `canvasExport`, `renderFrame` (9-arg drawImage)

**Critères de validation**

- [x] Presets réseaux sociaux appliquent le bon ratio et export (dimensions canvas = export ; `canvasToPngBlob`)
- [x] Presets custom persistés en SQLite
- [x] Drag/zoom capture dans le cadre fluide
- [x] Barre de style et barre de presets utilisables sans régression perf (rAF inchangé)

### Sprint 1.4 (Semaines 15–16) - Annotations

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-019 | Outil texte : insertion, police, taille, couleur, fond | P0 | 3j | P1-007 |
| `[x]` (2026-06-16) | P1-020 | Formes : rectangle, ellipse | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-021 | Formes : flèche, ligne | P0 | 1j | P1-020 |
| `[x]` (2026-06-16) | P1-022 | Surbrillance (highlight semi-transparent) | P0 | 1j | P1-007 |
| `[x]` (2026-06-16) | P1-023 | Flou de zone (pixelisation ou blur gaussien) | P0 | 2j | P1-007 |
| `[x]` (2026-06-16) | P1-024 | Gestion des couches : sélection, déplacement, redimensionnement, suppression | P0 | 2j | P1-019 |
| `[x]` (2026-06-16) | P1-025 | Undo/Redo (historique d'actions) | P0 | 1j | P1-024 |

**Livrable :** Annotations complètes avec gestion des couches et undo/redo.

**Livré (code, 2026-06-16)**

- **Modèle** : `annotations/types.ts` - union `Annotation` (texte, rect, ellipse, arrow, line, highlight, blur)
- **Moteur** : `drawBlurMasks` (layer 4), `drawAnnotations` (layer 5), `drawSelectionHandles`, `hitTest` ; `renderFrame` étendu
- **Store** : `annotations`, `activeTool`, `toolDefaults`, `pushHistory` / `undo` / `redo` (20 niveaux) ; reset à chaque capture
- **Interaction** : `useAnnotationInteraction` (drag-to-draw, select/move/resize), `useScreenshotTransformEnabled` (outil Move), `useEditorShortcuts` (Cmd+Z, Delete)
- **UI** : `AnnotationToolbar` + `TextEditorOverlay` ; section Annotations dans `EditorToolsPanel` (Feature Stack)
- **Tests** : Vitest - `drawAnnotations`, `drawBlurMasks`, `hitTest`, `history`, `renderFrame` (annotations)

**Critères de validation**

- [x] Tous les outils d'annotation fonctionnels (texte, formes, highlight, flou)
- [x] Couches sélectionnables, déplaçables, redimensionnables
- [x] Undo/redo ≥ 20 niveaux sans corruption du rendu
- [x] Annotations incluses à l'export PNG/JPG/WebP (composées dans `renderFrame` → `canvasToPngBlob` WYSIWYG)

### Sprint 1.5 (Semaines 17–18) - Redaction & Export

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-026 | Moteur de détection on-device : emails, téléphones, cartes bancaires | P0 | 3j | P1-007 |
| `[x]` (2026-06-16) | P1-027 | Détection : clés API, URLs sensibles, mots de passe | P0 | 2j | P1-026 |
| `[x]` (2026-06-16) | P1-028 | UI de redaction : highlight des zones détectées, masquage 1-clic | P0 | 2j | P1-026 |
| `[x]` (2026-06-16) | P1-029 | Mode automatique : redaction globale activable dans les settings | P1 | 1j | P1-028, P0-016 |
| `[x]` (2026-06-16) | P1-030 | Export PNG (qualité max) | P0 | 1j | P1-007 |
| `[x]` (2026-06-16) | P1-031 | Export JPG (qualité configurable) + WebP | P0 | 1j | P1-030 |
| `[x]` (2026-06-16) | P1-032 | Copier dans le presse-papier (Cmd+C / Ctrl+C) | P0 | 1j | P1-030 |
| `[x]` (2026-06-16) | P1-033 | Glisser-déposer vers apps externes | P1 | 1j | P1-030 |

**Livrable :** Redaction fonctionnelle + export multi-format + copier/coller.

**Livré (code, 2026-06-16)**

- **Redaction Rust** : `src-tauri/src/redaction/` - OCR macOS (Vision) + Windows (`Windows.Media.Ocr`), détecteurs regex (email, phone, card/Luhn, api_key, url, password), IPC `detect_sensitive_data`
- **Redaction UI** : `modules/redaction/` - `RedactionBar`, `RedactionOverlay`, scan → masquage 1-clic → `BlurAnnotation`, `useAutoRedaction` + toggle settings
- **Export** : `modules/export/` - `renderToExportCanvas` (offscreen WYSIWYG), `ExportBar` (PNG/JPG/WebP + qualité), save dialog + fs, clipboard (`Cmd+C`), drag-out
- **Plugins Tauri** : clipboard-manager, dialog, fs
- **Analytics** : `export_completed`, `redaction_triggered`
- **Tests** : Vitest export/redaction layout ; Rust recall ≥ 90% sur corpus détecteurs

**Critères de validation**

- [x] Détection PII on-device (aucun appel réseau) avec taux de rappel acceptable sur jeu de test
- [x] Masquage 1-clic + mode auto activable
- [x] Export PNG/JPG/WebP + copier presse-papier + drag-out fonctionnels
- [x] Masquage via `drawBlurMasks` (blur gaussien) sur régions détectées - pas de fuite de pixels sur le rendu exporté

### Sprint 1.6 (Semaines 19–20) - Historique & Polish MVP

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-16) | P1-034 | Historique des 30 dernières captures (stockage local + miniatures) | P0 | 2j | P0-006 |
| `[x]` (2026-06-16) | P1-035 | UI historique : grille, preview, réouverture dans l'éditeur | P0 | 2j | P1-034 |
| `[x]` (2026-06-16) | P1-036 | Tests d'intégration end-to-end : flux complet capture → beautify → export | P0 | 3j | Tous P1-* |
| `[x]` (2026-06-16) | P1-037 | Corrections de bugs et polish UX (feedback interne) | P0 | 3j | Tous P1-* |
| `[x]` (2026-06-16) | P1-038 | Optimisation performances : profiling, memory leaks, temps de rendu | P1 | 2j | Tous P1-* |
| `[x]` (2026-06-16) | P1-039 | Préparation des builds de release macOS (.dmg) + Windows (.msi/.exe) | P0 | 2j | P0-023 |

**Livrable :** MVP Desktop complet et testé, prêt pour la beta.

**Livré (code, 2026-06-16)**

- **Historique** : `modules/history/` - persistance PNG + miniatures WebP on-device, SQLite `captures`, retention 30, queue séquentielle
- **DB** : `db/captures.ts` - insert/list/prune/delete
- **UI** : route `/history`, grille + preview modal + open/delete, nav History
- **E2E natif** : `e2e_inject_screenshot`, bridge export dev, spec `capture-beautify-export.spec.ts`, fixture PNG 800×600
- **Perf** : marks `snapglow-render` en dev, `stressCaptures.test.ts` + `pnpm test:stress-captures`
- **Release beta unsigned** : doc install Gatekeeper/SmartScreen, checklist secrets updater, stub Windows signing dans `release.yml`
- **Polish UX (P1-037, Hallmark)** : `design.md` verrouillé (Feature Stack, nav N1b, thème warm amber OKLCH, IBM Plex Sans/Mono) ; passes audit 0 critical / ship-ready ; conformité pass 5
- **Shell** : `AppTopNav` (wordmark + liens Editor / History / Settings), routes `min-h-0 flex-1` (scroll unique)
- **Éditeur** : `EditorSection` + `EditorToolsPanel` - ordre Format → Style → Annotations → Sensitive data → Export ; gradients adoucis ; focus rings, tooltip 800 ms, boutons `:active`
- **Historique / Settings** : parité layout `max-w-5xl`, titres `font-display`

**Checklist QA interne (P1-037 - buffer sprint review)**

- [x] Capture → entrée historique + miniature visible
- [x] Historique → preview → réouverture éditeur (état frais)
- [x] Historique → delete supprime fichier + row SQLite
- [x] Raccourcis : Cmd/Ctrl+Shift+S capture, Cmd/Ctrl+C export, undo/redo annotations
- [x] Overlay : annulation Esc, multi-monitor, fenêtre/zone/écran
- [x] Redaction auto + export WYSIWYG (pas de fuite pixels)
- [x] Tray : show/hide, navigation Settings/History
- [x] Install unsigned macOS + Windows (voir `release-signing.md` §5)

**Critères de validation**

- [x] Historique 30 captures avec miniatures ; réouverture éditeur OK
- [x] E2E WebDriver : inject → beautify → export vert (Linux/Windows CI)
- [x] Builds release unsigned installables macOS + Windows (doc + workflows)
- [x] Profiling : stress test 50 captures (`stressCaptures.test.ts`)
- [x] Jalon J1 validé en sprint review

---

**Jalon J1 (fin M5) :** MVP multiplateforme complet (macOS + Windows). Toutes les features core fonctionnelles.

---

## 5. PHASE 1b - MVP Mobile (M4–M6)

> Objectif : proposer une app compagnon iOS et Android avec parité fonctionnelle sur la beautification.
> Note : démarrage en parallèle du Sprint 1.4 desktop.

### Sprint 1b.1 (Semaines 15–16) - Setup React Native & Capture mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-20) | M1-001 | Setup projet React Native (Expo) iOS + Android ; ajouter `dev:mobile` dans `mise.toml` | P0 | 2j | - |
| `[x]` (2026-06-20) | M1-002 | Implémenter Share Extension iOS (import depuis Photos/apps) | P0 | 3j | M1-001 |
| `[x]` (2026-06-20) | M1-003 | Implémenter Share Intent Android (import depuis Photos/apps) | P0 | 3j | M1-001 |
| `[x]` (2026-06-20) | M1-004 | Réutiliser les composants UI du design system (adaptation mobile) | P0 | 2j | P0-009, M1-001 |

**Livrable :** App Expo iOS + Android (development builds), import image via share sheet, design tokens SnapGlow sur mobile.

**Livré (code, 2026-06-20)**

- **`apps/mobile`** (`@snapglow/mobile`) : Expo SDK 56, Expo Router, `expo-dev-client`, `mise run dev:mobile` / `dev:mobile:ios` / `dev:mobile:android`
- **Share import** : `expo-share-intent` (Share Extension iOS + Intent Android `image/*`), module `src/modules/capture/` (Zustand + `useShareImport`), écran `/import`
- **`packages/design-tokens`** : build étendu → `dist/tokens.native.ts` (OKLCH → hex, thèmes light/dark, spacing/radius)
- **`packages/ui-native`** : `ThemeProvider`, `Button` (StyleSheet, API alignée web) ; consomme `tokens.native`
- **UI** : écran home showcase tokens + toggle thème ; preview image importée tokenisée
- **Tooling** : `metro.config.js` monorepo, `.agents/rules/mobile.md`, `typescript-config/react-native.json`
- **Build iOS** : prebuild + simulateur OK (warnings Xcode bénins) ; `ios/`/`android/` gitignorés (regénérés par prebuild)

**Checklist QA interne (Sprint 1b.1)**

- [x] `mise run dev:mobile` démarre Metro dev client
- [x] `mise run dev:mobile:ios` — build + install simulateur iPhone 17
- [x] Share Photos → SnapGlow → preview `/import` (iOS simulateur / device)
- [x] Share Galerie → SnapGlow → preview `/import` (Android émulateur / device)
- [x] Boutons primary/secondary/destructive + thème light/dark sur home

**Critères de validation**

- [x] `mise run dev:mobile` lance Expo dev client ; `dev:mobile:ios` / `dev:mobile:android` disponibles
- [x] Share Extension / Intent importe une image dans l'app (QA iOS + Android validée)
- [x] Composants design-tokens rendus correctement sur mobile (`@snapglow/ui-native` + écran showcase)

### Sprint 1b.2 (Semaines 17–18) - Beautification & Presets mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-20) | M1-005 | Porter le moteur de beautification sur mobile (Canvas/Skia) | P0 | 4j | M1-001, P1-007 |
| `[x]` (2026-06-20) | M1-006 | Presets réseaux sociaux (format mobile) | P0 | 1j | M1-005 |
| `[x]` (2026-06-20) | M1-007 | Annotations tactiles : texte, formes, flou | P0 | 3j | M1-005 |
| `[x]` (2026-06-20) | M1-008 | Export : sauvegarde dans Photos, partage via sheet natif | P0 | 2j | M1-005 |

**Livré (code, 2026-06-20)**

- **`packages/editor-core`** : types, layout, presets, gradients, annotations, blur algos + tests ; desktop refactoré
- **`apps/mobile/src/modules/editor/`** : store Zustand, renderer Skia, StyleBar, PresetBar/Picker, annotations tactiles, undo/redo
- **`apps/mobile/src/modules/export/`** : snapshot Skia (`makeImageSnapshotAsync`), encodage base64 → `expo-file-system/legacy`, Photos (`expo-media-library` write-only + plist), partage iOS (`Share.share`) / Android (`expo-sharing`) ; export preview-scaled en 1b.2, pleine résolution en 1b.3
- **Route `/editor`** : handoff `/import` → éditeur ; `@shopify/react-native-skia`, `react-native-gesture-handler`
- **`packages/ui-native`** : `Slider`, `SegmentedControl`
- **Native iOS** : `NSPhotoLibraryAddUsageDescription` / `NSPhotoLibraryUsageDescription` via plugin `expo-media-library` ; rebuild natif après ajout de plugins (`expo prebuild`)

**Checklist QA interne (Sprint 1b.2)**

- [x] Import → `/editor` : beautify + presets + annotations tactiles
- [x] Save to Photos (permission + enregistrement)
- [x] Share sheet natif (iOS simulateur : warnings `[Sharing]` console possibles sans blocage)
- [x] Export pleine résolution layout (complété en 1b.3 — `ExportCanvas` offscreen + `exportMode`)

**Critères de validation**

- [x] Beautification mobile paritaire avec desktop (presets, padding, ombre)
- [x] Annotations tactiles utilisables
- [x] Export Photos + share sheet natif fonctionnels

### Sprint 1b.3 (Semaines 19–20) - Polish & Tests mobile

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-20) | M1-009 | Redaction de données sensibles (adaptation mobile) | P0 | 2j | M1-005, P1-026 |
| `[x]` (2026-06-20) | M1-010 | Tests sur devices réels (iPhone 14+, Pixel 7+, Samsung Galaxy S23+) | P0 | 3j | Tous M1-* |
| `[x]` (2026-06-20) | M1-011 | Optimisation performances mobile (temps de rendu, mémoire) | P1 | 2j | Tous M1-* |
| `[~]` (2026-06-20) | M1-012 | Préparation submission App Store + Google Play | P0 | 2j | Tous M1-* |

**Livré (code, 2026-06-20)**

- **`@snapglow/redaction-core`** : détecteurs TS (6 kinds), `mapRegionToLayout`, Vitest recall ≥ 90% ; desktop `mapToLayout` refactoré
- **`modules/snapglow-ocr`** : Expo module natif — Apple Vision (iOS) + ML Kit (Android), OCR downscale max 2048px
- **`apps/mobile/src/modules/redaction/`** : `RedactionBar`, `RedactionOverlay`, scan → blur, auto-redact AsyncStorage
- **Export pleine résolution** : `ExportCanvas` offscreen (`exportMode`) dans `ExportBar`
- **Docs QA** : `apps/mobile/docs/qa/device-matrix.md` (matrice + perf notes)
- **Store prep** : `eas.json`, `release-signing-mobile.md`, `listing-checklist.md`, workflow `.github/workflows/mobile-build.yml`, `APP_VARIANT` production sans dev-client

**Critères de validation**

- [x] Redaction mobile alignée desktop (on-device)
- [x] Tests devices réels documentés (matrice OS / modèles)
- [~] Builds TestFlight + Play Internal Testing uploadés — **EAS prêt ; upload bloqué sans comptes Apple/Google**

### Sprint 1b.4 (Semaines 21–22) - Soumission & Corrections

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | M1-013 | Soumission App Store (review Apple) | P0 | - | M1-012 |
| `[ ]` | M1-014 | Soumission Google Play | P0 | - | M1-012 |
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

## 6. PHASE 2 - Lancement (M6)

> Objectif : beta fermée, feedback, puis lancement public coordonné.

### Sprint 2.1 (Semaines 23–24) - Beta fermée

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

### Sprint 2.2 (Semaines 25–26) - Lancement public

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

**Jalon J3 (M6) :** Lancement public - Product Hunt + AppSumo.

---

## 7. PHASE 2b - IA & Cloud (M7–M9)

> Objectif : ajouter l'intelligence artificielle, les captures avancées, et le cloud.

### Sprint 2b.1 (Semaines 27–28) - Suggestion de style IA

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[~]` (2026-06-20) | AI-001 | Entraîner/adapter un modèle de classification de contenu (code, UI, photo, texte) | P0 | 4j | - |
| `[~]` (2026-06-20) | AI-002 | Intégrer le modèle on-device (TF Lite macOS/Windows, Core ML macOS) | P0 | 3j | AI-001 |
| `[x]` (2026-06-20) | AI-003 | Mapper classification → presets de style recommandés | P0 | 2j | AI-001 |
| `[x]` (2026-06-20) | AI-004 | UI : badge "Suggested" + application en 1 clic | P0 | 1j | AI-003 |

**Livré (code, 2026-06-20)**

- **`@snapglow/style-suggestion-core`** : 6 classes (`code`, `ui`, `terminal`, `photo`, `diagram`, `text`), mapping §8.2 → gradient/solid/blur + ombres, Vitest
- **`apps/desktop/src/modules/style-suggestion/`** : `StyleSuggestionBar`, scan auto (`autoStyleSuggestion`, défaut ON), Apply 1 clic, fond photo flouté
- **`apps/desktop/src-tauri/src/classification/`** : commande `classify_content_command`, preprocessing 224×224, inférence TFLite (`tract-tflite`) si modèle bundlé, **fallback heuristique** sinon ; latence < 500 ms (test Rust)
- **`tools/style-classifier/`** : scripts `collect`, `train` (MobileNetV3-Small), `evaluate` (gate ≥ 80 %), `export` (.tflite + .mlmodel) — voir `tools/README.md`

**Dataset (2026-06-21)** — pipeline de constitution livré

- **`tools/style-classifier/sources.json`** : manifeste des sources publiques recherchées et documentées (license + usage commercial) pour les 6 classes
- **`scripts/fetch_dataset.py`** : télécharge `ui` ([WebUI](https://huggingface.co/datasets/biglab/webui-7k)), `photo` ([Unsplash Lite](https://huggingface.co/datasets/1aurent/unsplash-lite)), `text` ([DocLayNet](https://huggingface.co/datasets/pierreguillou/DocLayNet-base), CDLA-Permissive) → `dataset/raw/<class>/` ; auto-détection colonne image, dedup, normalisation PNG ; écrit `SOURCES.lock.json` (provenance)
- **`scripts/synthesize.py`** : génère `code`/`terminal`/`diagram` (license-clean) via Pygments + Graphviz (fallback matplotlib/networkx) — smoke test OK (PNG valides)
- **Conformité normes** : on-device, pas de PII, images non commitées (`.gitignore`), licences tracées — voir [`tools/style-classifier/DATASET.md`](../../../tools/style-classifier/DATASET.md)
- **Reste à faire (machine réseau + CPU/GPU)** : `pip install -r requirements.txt` → `fetch_dataset.py --limit 1500` → `collect.py` → `train.py` → `evaluate.py` (gate ≥ 80 %) → `export.py`

**En attente (bloquant prod ML)**

- **Entraînement** : pipeline dataset prêt ; `train.py` / `evaluate.py` non encore exécutés (lancer la collecte ci-dessus)
- **Artefacts modèle** : `content_classifier.tflite` / `.mlmodel` absents de `apps/desktop/src-tauri/resources/models/` (seul `labels.json`)
- **Core ML natif macOS** : délègue au TFLite bundlé ; inférence `.mlmodel` directe non câblée
- **Précision ≥ 80 %** : gate `evaluate.py` non validé sans jeu test

**Critères de validation**

- [x] Classification on-device sans réseau ; latence < 500 ms (heuristique + pipeline TFLite prêt)
- [x] Badge "Suggested" + application style en 1 clic (desktop)
- [ ] Précision acceptable sur jeu de test interne (≥ 80 %) — **pipeline dataset livré (2026-06-21) ; reste l'entraînement AI-001**

### Sprint 2b.2 (Semaines 29–30) - OCR & Auto-crop

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-20) | AI-005 | Intégrer Tesseract.js (cross-platform) pour OCR | P0 | 2j | - |
| `[x]` (2026-06-20) | AI-006 | Intégrer Apple Vision Framework (macOS) comme moteur OCR alternatif | P1 | 2j | - |
| `[x]` (2026-06-20) | AI-007 | UI : bouton "Copier le texte", sélection de zones de texte | P0 | 2j | AI-005 |
| `[x]` (2026-06-20) | AI-008 | Auto-crop : détection et suppression des espaces vides excessifs | P0 | 2j | P1-007 |
| `[x]` (2026-06-20) | AI-009 | Compression intelligente (mozjpeg + pngquant) | P1 | 2j | P1-030 |

**Livré (code, 2026-06-20)**

- **`@snapglow/ocr-core`** : types `TextLine`, helpers `linesToPlainText` / `mergeSelectedLines`, `mapLineToLayout`
- **`apps/desktop/src-tauri/src/ocr/`** : moteurs natifs (Vision macOS, Windows OCR) + fallback **Tesseract CLI** ; commande `recognize_text_command`
- **`apps/desktop/src/modules/text-extraction/`** : `TextExtractionBar`, overlay sélection, copie presse-papiers (`writeText`)
- **`apps/desktop/src-tauri/src/image_processing/trim.rs`** : `detect_content_bounds_command`, `crop_image_command` ; UI `AutoCropBar`
- **`apps/desktop/src-tauri/src/image_processing/compress.rs`** : `compress_export_bytes_command` (imagequant PNG, JPEG optimisé, WebP) ; toggle **Smart export compression** dans Settings
- **Settings** : `ocrEngine`, `ocrLanguages`, `smartCompression`

**Notes d'implémentation**

- AI-005 : Tesseract via **CLI système** (`tesseract … tsv`) plutôt que `tesseract.js` WASM — même intent FR-009, meilleure intégration Tauri offline
- AI-006 : Vision déjà utilisée pour redaction ; exposée pour copy-text via `recognize_text_command` (mode `native` / `auto`)
- Tesseract fallback : `brew install tesseract` (+ langues) sur macOS dev ; variable `TESSDATA_PREFIX` ou `SNAPGLOW_TESSDATA_DIR`

**Critères de validation**

- [x] OCR copie texte depuis capture ; sélection de zones OK (desktop)
- [x] Auto-crop réduit marges vides sans rogner le contenu (tests Rust trim + undo éditeur)
- [x] Compression réduit taille fichier ≥ 30 % sans perte visible (test Rust `png_compression_reduces_size`)

### Sprint 2b.3 (Semaines 31–32) - Capture scrollante & GIF

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-20) | AC-001 | Capture scrollante macOS (scroll automatique + assemblage) | P0 | 4j | P1-001 |
| `[x]` (2026-06-20) | AC-002 | Capture scrollante Windows | P0 | 4j | P1-002 |
| `[x]` (2026-06-20) | AC-003 | Capture différée (timer 3/5/10 secondes) | P1 | 1j | P1-001 |
| `[x]` (2026-06-20) | AC-004 | Capture de menu ouvert | P1 | 2j | P1-001 |

**Livré (code + QA manuelle, 2026-06-20)**

- **ADR-007** : flux live capture (preview crop vs native grab) — [007-live-capture-flows.md](../technical/adr/007-live-capture-flows.md)
- **Rust** : `capture/native.rs` (`capture_native_command`), `capture/scroll.rs` + `capture/stitch.rs` (`capture_scrolling_window_command`), `resolve_window` (WindowInfo, exclusion fenêtres SnapGlow), scroll plateforme macOS (CGEvent clavier Home / ⌘↑ / Page Down) + Windows (`VK_HOME` / `VK_NEXT`)
- **Overlay** : modes **Scroll** et **Menu** ; dropdown **Delay** (Off / 3s / 5s / 10s) ; countdown overlay ; HUD flottant scroll (pastille + **Done** + état « Finishing capture… »)
- **Menu** : overlay live sans preview, délai 3s par défaut, capture region ou fenêtre après countdown
- **Scroll** : remontée en haut → pause 600 ms → capture viewport → Page Down → pause settle interruptible 550 ms → stitch overlap (`stitch.rs`) ; **Done** = `stop_scrolling_capture_command` (assemble les frames acquises, pas annulation) ; **Cancel** = `cancel_live_capture_command`
- **IPC** : `capture-progress`, `cancel_live_capture_command`, `stop_scrolling_capture_command`, `show_live_capture_overlay` ; payload scroll = `WindowInfo` (pas seul `windowId`)

**Améliorations post-livraison (backlog)**

- Sticky headers / overlap stitch sur pages complexes (headers répétés, cartes identiques)
- Matrice apps (Electron, Safari, PDF viewers, scroll interne vs fenêtre)
- Permission **Accessibilité** macOS si Page Down synthétique ignorée
- Affinage settle / vitesse selon app cible

**Critères de validation**

- [x] (2026-06-20) Capture scrollante macOS + Windows sur pages test (long scroll) — QA manuelle OK ; améliorations stitch prévues
- [x] (2026-06-20) Timer différé et capture menu ouvert fonctionnels — QA manuelle OK

### Sprint 2b.4 (Semaines 33–34) - Capture vidéo/GIF

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` | AC-005 | Enregistrement de zone d'écran (< 30s) - macOS | P0 | 3j | P1-001 |
| `[x]` | AC-006 | Enregistrement de zone d'écran - Windows | P0 | 3j | P1-002 |
| `[x]` | AC-007 | Encodage GIF optimisé (< 10MB pour 10s) | P0 | 2j | AC-005 |
| `[x]` | AC-008 | Export vidéo MP4 (H.264) | P1 | 2j | AC-005 |
| `[x]` | AC-009 | UI : contrôles d'enregistrement (start, stop, pause) | P0 | 1j | AC-005 |

**Livraison (2026-06-20, QA validée 2026-06-21)**

- **UI overlay** : toggle Photo / Video ; mode **Record** zone uniquement (fenêtre / écran grisés — `captureModes.ts`) ; toggle GIF / MP4 ; qualité GIF low / medium / high (`CaptureToolbar.tsx`) ; HUD pause / stop / timer (`useRecordingElapsed.ts`, `CaptureProgressBanner.tsx`)
- **Capture frames**
  - **macOS** : ScreenCaptureKit streaming ~30 fps, crop région retina (`platform/macos_record.rs`) ; permission Screen Recording requise
  - **Windows** : polling `capture_region` ~20 fps (50 ms), timestamps par frame (`capture/record/session.rs`) ; adapter `windows_record.rs` (upgrade WGC en backlog)
- **Frames temporaires** : RGBA horodatées `frame_{index}_{timestamp_ms}.rgba` sous `tempfile` ; durée active (pause exclue) via `control.rs`
- **Durées** : GIF auto-stop **8 s** (boucles courtes) ; MP4 plafond **30 s**
- **IPC** : `start_region_recording_command`, `pause_region_recording_command`, `resume_region_recording_command`, `stop_region_recording_command`, `cancel_region_recording_command` ; progress `capture-progress` (`phase: "recording"`) ; complete `capture-recording-complete` ; `open_path_command` (lecteur OS)
- **GIF** : `encode_gif.rs` — grille 20 fps à partir de timestamps VFR, palette globale `imagequant`, budgets low / medium / high, boucle infinie ; test unitaire < 10 MB / 10 s (qualité low)
- **MP4** : `encode_mp4.rs` — resampling CFR 12–30 fps (openh264 + mux `mp4`) ; corrige les freezes QuickTime sur contenu statique / pauses
- **Post-capture** : staging `app_data/recording-staging/` → dialogue sauvegarde (`saveRecording.ts`) → historique (`persistRecording.ts`, `format: gif|mp4`, miniature 1ʳᵉ frame) → ouverture lecteur OS si l’utilisateur choisit un emplacement ; pas d’éditeur
- **ADR-008**

**Améliorations post-livraison (backlog)**

- Enregistrement fenêtre / plein écran (cibles UI déjà visibles, backend region-only)
- Windows : `Windows.Graphics.Capture` streaming (remplacer polling xcap)

**Critères de validation**

- [x] (2026-06-21) Enregistrement zone GIF (≤ 8 s) + MP4 (≤ 30 s) macOS + Windows — QA manuelle OK
- [x] GIF < 10 MB pour 10 s (test unitaire Rust, qualité low) ; MP4 lecture fluide (CFR, test Rust gaps statiques)
- [x] Contrôles start / stop / pause utilisables (HUD overlay) ; post-capture sauvegarde + historique + ouverture lecteur

### Sprint 2b.5 (Semaines 35–36) - Cloud & Partage

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-27) | CL-001 | Setup backend API (Fastify) + PostgreSQL + Redis ; ajouter `dev:api` dans `mise.toml` | P0 | 3j | - |
| `[x]` (2026-06-27) | CL-002 | Setup stockage fichiers (Cloudflare R2) | P0 | 2j | CL-001 |
| `[x]` (2026-06-27) | CL-003 | Système d'authentification (Clerk/Auth0 - OAuth2) | P0 | 2j | CL-001 |
| `[x]` (2026-06-27) | CL-004 | Upload automatique + génération de lien partageable | P0 | 2j | CL-002 |
| `[x]` (2026-06-27) | CL-005 | Page de visualisation publique du lien partagé | P0 | 2j | CL-004 |
| `[x]` (2026-06-27) | CL-006 | Expiration configurable des liens (1h, 24h, 7j, permanent) | P1 | 1j | CL-004 |

**Livraison (2026-06-27)**

- **`apps/api`** : Fastify 5, Drizzle/Postgres, Redis rate limit, MinIO dev / R2 prod (`StorageService`), Auth0 JWT (JWKS), `POST/GET /v1/shares`, `GET /health`, docker-compose, `mise run dev:api`
- **`packages/cloud-core`** : types partagés, expiry helpers, tests Vitest
- **Desktop** : `modules/cloud/` Auth0 PKCE + deep link `snapglow://auth/callback`, Settings sign-in, ExportBar **Share link** (consentement dialog + expiry select + clipboard)
- **Web** : route `/s/$token` viewer SSR (image/vidéo, OG image, 404/410)
- **ADR-009**, `.agents/rules/api.md`

**Reporté**

- **Terraform GCP + Docker infra** - infra cloud gérée manuellement ou via PaaS en premier temps.
- **Mobile cloud share** (API prête)

**Critères de validation**

- [x] `mise run dev:api` lance Fastify + Postgres + Redis local — code livré (docker-compose + mise task)
- [x] Upload → lien public → page viewer fonctionnels — code livré ; QA E2E manuelle en attente
- [x] Expiration liens configurable et respectée — code livré ; QA en attente

### Sprint 2b.6 (Semaines 37–38) - Intégrations & Organisation

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-27) | CL-007 | Intégration Slack (envoi direct depuis l'éditeur) | P0 | 2j | CL-003 |
| `[x]` (2026-06-27) | CL-008 | Intégration Notion | P1 | 2j | CL-003 |
| `[x]` (2026-06-27) | CL-009 | Intégration Linear | P1 | 2j | CL-003 |
| `[x]` (2026-06-27) | CL-010 | Intégration GitHub Issues | P1 | 2j | CL-003 |
| `[x]` (2026-06-27) | CL-011 | Watermark personnalisable (logo, nom, URL) | P1 | 2j | P1-007 |
| `[x]` (2026-06-27) | CL-012 | Bibliothèque de captures avec recherche full-text (OCR) | P0 | 3j | AI-005, P1-034 |
| `[x]` (2026-06-27) | CL-013 | Tags et collections | P1 | 2j | CL-012 |

**Livraison (2026-06-27)**

- **`packages/integrations-core`** : types providers (Slack, Notion, Linear, GitHub), scopes OAuth, shapes send
- **`apps/api`** : proxy OAuth `GET/POST /v1/integrations/:provider/*` ; library `POST/GET/PATCH /v1/library`, CRUD `/v1/collections` ; Drizzle `library_items` + `collections` (`drizzle/0001_library.sql`)
- **Desktop intégrations** : `modules/integrations/` (OAuth via API, tokens SQLite, deep link `snapglow://integrations/callback`), Settings **Integrations**, ExportBar **Send to…** (consentement + picker destination) — Slack channel, Notion page, Linear issue, GitHub issue
- **Library hybride** : migration SQLite `002_library_ocr.sql` (FTS5 + `ocr_text`), indexation OCR async dans `persistCapture`, UI **Library** (recherche OCR, filtres tag/collection, résultats cloud si Auth0 actif), `syncLibrary.ts`
- **Watermark** : `WatermarkConfig` (`@snapglow/editor-core`), `drawWatermark.ts`, Settings `WatermarkSection`, inclus export / share / Send to…
- **ADR-010**, `.agents/rules/api.md`, `apps/api/.env.example` (credentials OAuth par provider)

**Reporté**

- **Mobile** library + intégrations (API prête)
- **Billing watermark** (toggle stub ; enforcement plan Free/Pro en backlog)
- **Notion file-upload API** (fallback data-URI ; gros fichiers en backlog)

**Critères de validation**

- [ ] Intégration Slack opérationnelle (envoi depuis éditeur) — code livré ; QA OAuth apps requise
- [ ] Bibliothèque cloud avec recherche OCR — code livré ; QA sync + FTS locale en attente
- [ ] Tags et collections utilisables — code livré ; QA en attente
- [ ] Jalon J4 validé (1 000 utilisateurs payants - métrique produit)

---

**Jalon J4 (M9) :** 1 000 utilisateurs payants. IA + Cloud opérationnels.

---

## 8. PHASE 3 - Team & B2B (M10–M14)

> Objectif : débloquer le segment B2B avec collaboration, workspaces, et API.

### Sprint 3.1–3.2 (Semaines 39–42) - Workspace & Gestion d'équipe

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[x]` (2026-06-27) | T-001 | Modèle de données multi-tenant (workspaces, rôles, invitations) | P0 | 4j | CL-001 |
| `[x]` (2026-06-27) | T-002 | UI gestion d'équipe : invitations, rôles (admin/éditeur/viewer) | P0 | 4j | T-001 |
| `[x]` (2026-06-27) | T-003 | Brand kit centralisé : couleurs, polices, logos partagés | P0 | 3j | T-001 |
| `[x]` (2026-06-27) | T-004 | SSO (SAML/OIDC) pour Team Pro | P1 | 3j | CL-003, T-001 |
| `[x]` (2026-06-27) | T-005 | Billing team : intégration Stripe (par siège/mois) | P0 | 3j | T-001 |

**Livraison (2026-06-27)**

- **ADR-011** : multi-tenant, Stripe, SSO Auth0 Organizations, brand kit
- **`@snapglow/team-core`** : rôles, `can()`, limites plans (`MAX_MEMBERS_TEAM_STARTER=5`)
- **API** : migration `0002_workspaces.sql`, routes workspaces/members/invitations/brand-kit/billing/sso
- **Desktop** : `modules/team/` (Settings TeamSection, WorkspaceSwitcher, invite deep link `snapglow://team/invite`, `X-Workspace-Id` on cloud uploads, brand kit fusion on export)
- **Stripe sandbox** : checkout + webhook handlers ; Customer Portal stub in desktop
- **SSO** : Auth0 org creation via Management API (optional env) ; PKCE `organization` param when workspace has `auth0_org_id`

**Critères de validation**

- [x] Workspace créable ; invitations + rôles fonctionnels
- [x] Brand kit partagé appliqué aux exports team (when paid plan + toggle ON)
- [ ] Billing Stripe par siège opérationnel (sandbox puis prod) — code livré ; QA sandbox manuelle

### Sprint 3.3–3.4 (Semaines 43–46) - Collaboration temps réel

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-006 | Serveur WebSocket pour collaboration en temps réel | P0 | 4j | CL-001 |
| `[ ]` | T-007 | Annotations partagées (curseurs multiples, sync) | P0 | 5j | T-006, P1-024 |
| `[ ]` | T-008 | Système de commentaires sur les captures | P0 | 3j | T-006 |
| `[ ]` | T-009 | Notifications (in-app + email) sur les commentaires/mentions | P1 | 2j | T-008 |

**Critères de validation**

- [ ] 2+ utilisateurs annotent simultanément avec sync < 200 ms
- [ ] Commentaires + notifications email/in-app fonctionnels

### Sprint 3.5–3.6 (Semaines 47–50) - API publique

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

### Sprint 3.7–3.8 (Semaines 51–54) - Plugins

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-015 | Plugin VS Code : capture depuis l'éditeur + beautification | P0 | 4j | T-011 |
| `[ ]` | T-016 | Plugin Figma : import/export depuis Figma | P1 | 4j | T-011 |
| `[ ]` | T-017 | Plugin Notion : embed enrichi dans les pages | P1 | 3j | T-011 |
| `[ ]` | T-018 | Rapports d'utilisation team (captures/membre, exports, cloud usage) | P1 | 3j | T-001 |

**Critères de validation**

- [ ] Plugin VS Code publié sur Marketplace (ou VSIX interne)
- [ ] Rapports d'utilisation team disponibles dans dashboard

### Sprint 3.9–3.10 (Semaines 55–58) - Polish & Stabilisation B2B

| Statut | ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|---|
| `[ ]` | T-019 | Tests de charge API (1000+ requêtes/min) | P0 | 2j | T-011 |
| `[ ]` | T-020 | Audit sécurité (OWASP, pentest basique) | P0 | 3j | Tous T-* |
| `[ ]` | T-021 | Onboarding team : wizard de setup workspace | P0 | 2j | T-002 |
| `[ ]` | T-022 | Documentation utilisateur (help center / knowledge base) | P0 | 3j | - |
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

## 9. PHASE 4 - Scale (M15–M18)

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
| Phase 4 | M15–M18 | 8 | Marketplace, affiliés, i18n, sync cross-device | - |

---

## Documents liés

- [[Cahier des Charges]] - Point d'entrée documentation
- [[Product Requirements]] - Exigences produit détaillées
- [[Technical Stack - Desktop]] - Architecture technique desktop
- [[Cahier des Charges]] - Spécifications originales
- [[Market Analysis]] - Analyse de marché

---

*v1.0 - Juin 2026 - Usage confidentiel*
