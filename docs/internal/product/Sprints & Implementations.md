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

### Structure monorepo cible (évolution)

```
apps/
├── desktop/     # Tauri v2 — macOS + Windows        (Phase 0–1)
├── web/         # Landing marketing — Astro + Vercel (Sprint 0.2)
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

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P0-001 | Initialiser monorepo (Turborepo + pnpm) + `mise.toml` (toolchains + tasks racine `dev:*`, `lint`, `install`) | P0 | 2j | — |
| P0-002 | Setup Tauri v2 — projet skeleton macOS + Windows | P0 | 3j | P0-001 |
| P0-003 | Configurer TypeScript + Biome (lint + format) | P0 | 1j | P0-001 |
| P0-004 | Configurer CI/CD (GitHub Actions) : build, lint, tests | P0 | 2j | P0-001 |
| P0-005 | Définir l'architecture des modules (capture, editor, export, settings) | P0 | 2j | P0-002 |
| P0-006 | Setup du store de configuration local (SQLite via Tauri) | P1 | 1j | P0-002 |
| P0-007 | Setup outillage dev : Hallmark + CodeGraph + Husky/Commitlint (temporaire) + `AGENTS.md` / `.agents/rules/` | P1 | 1j | P0-001 |

**Livrable :** Projet Tauri fonctionnel avec CI/CD, build macOS + Windows validé, `mise run dev:desktop` opérationnel, hooks git, index CodeGraph, conventions agent.

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
| `apps/web` landing **Astro** + Vercel | Sprint 0.2 | **Adopter** (P0-013) |
| `apps/mobile` **Expo / React Native** | Phase 1b | **Adopter** (M1-001) |
| `apps/api` **Fastify** + PostgreSQL | Phase 2b | **Adopter** (CL-001) |
| Release Please + CHANGELOG | Sprint 0.4+ | **Reporter** |
| Terraform GCP + Docker infra | Phase 2b+ | **Reporter** |
| oh-my-agent | — | **Ne pas adopter** |

### Sprint 0.2 (Semaines 3–4) — Design System & Prototype

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P0-008 | Créer le design system Figma (couleurs, typographie, composants) | P0 | 3j | — |
| P0-009 | Implémenter les composants UI de base (React + Tailwind) : boutons, inputs, sliders, tooltips, dropdowns — `packages/design-tokens` (pattern fullstack-starter) | P0 | 4j | P0-002, P0-007 |
| P0-010 | Créer le prototype interactif Figma du flux principal | P0 | 3j | P0-008 |
| P0-011 | Configurer Storybook pour la bibliothèque de composants | P1 | 1j | P0-009 |
| P0-012 | Implémenter le thème Light/Dark/System | P1 | 2j | P0-009 |
| P0-013 | Créer la landing page (`apps/web` — **Astro** + Vercel, pas Next.js) | P1 | 3j | P0-008 |
| P0-025 | Étendre `mise.toml` (`dev:web`, `tokens:build`) ; migrer Husky → **hooks git mise** (lint conditionnel par app) | P1 | 0.5j | P0-013 |

**Livrable :** Design system Figma, composants React, landing Astro en ligne, orchestration mise étendue (`dev:web`), hooks git migrés vers mise.

### Sprint 0.3 (Semaines 5–6) — Infrastructure & Intégration système

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P0-014 | Implémenter l'icône menu bar (macOS) / system tray (Windows) | P0 | 3j | P0-002 |
| P0-015 | Implémenter le système de raccourcis clavier global | P0 | 3j | P0-014 |
| P0-016 | Créer le système de settings/préférences persistant | P0 | 2j | P0-006 |
| P0-017 | Implémenter le lancement au démarrage (auto-start) | P1 | 1j | P0-014 |
| P0-018 | Setup des tests unitaires (Vitest) + tests e2e (Playwright) | P1 | 2j | P0-002 |
| P0-019 | Setup analytics (PostHog) et crash reporting (Sentry) | P1 | 1j | P0-002 |

**Livrable :** Application Tauri avec menu bar, raccourcis clavier, settings, auto-start fonctionnel.

### Sprint 0.4 (Semaines 7–8) — Polissage Phase 0 & Préparation Phase 1

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P0-020 | Audit qualité du design system — ajustements accessibilité (WCAG AA) | P0 | 2j | P0-009 |
| P0-021 | Documentation architecture (ADRs — Architecture Decision Records) | P1 | 2j | P0-005 |
| P0-022 | Setup du système de mise à jour automatique (Tauri updater) | P1 | 2j | P0-002 |
| P0-023 | Code signing macOS (Developer ID) + Windows (code signing cert) | P0 | 2j | P0-002 |
| P0-024 | Tests d'intégration menu bar + raccourcis sur macOS et Windows | P0 | 2j | P0-014, P0-015 |

**Livrable :** Phase 0 complète. Architecture validée, CI/CD opérationnel, base solide pour le MVP.

---

**Jalon J0 (fin M2) :** Projet skeleton fonctionnel, design system, CI/CD, landing page.

---

## 4. PHASE 1 — MVP Desktop (M2–M5)

> Objectif : livrer les fonctionnalités core de capture + beautification sur macOS et Windows.

### Sprint 1.1 (Semaines 9–10) — Capture d'écran native

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-001 | Implémenter la capture de zone (sélection libre) — macOS | P0 | 3j | P0-015 |
| P1-002 | Implémenter la capture de zone — Windows (Graphics Capture API) | P0 | 3j | P0-015 |
| P1-003 | Implémenter la capture de fenêtre (détection auto des bords) — macOS | P0 | 2j | P1-001 |
| P1-004 | Implémenter la capture de fenêtre — Windows | P0 | 2j | P1-002 |
| P1-005 | Implémenter la capture plein écran — macOS + Windows | P0 | 1j | P1-001, P1-002 |
| P1-006 | Tests capture sur multi-écran (display scaling, HiDPI) | P0 | 2j | P1-001, P1-002 |

**Livrable :** Capture fonctionnelle (zone, fenêtre, plein écran) sur macOS et Windows.

### Sprint 1.2 (Semaines 11–12) — Beautification automatique

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-007 | Implémenter le moteur de rendu Canvas (fond + capture + ombre) | P0 | 4j | P1-001 |
| P1-008 | Arrière-plans dégradés : bibliothèque de 50+ presets | P0 | 2j | P1-007 |
| P1-009 | Padding intelligent + auto-balance (centrage) | P0 | 2j | P1-007 |
| P1-010 | Coins arrondis configurables (slider 0–32px) | P0 | 1j | P1-007 |
| P1-011 | Ombre portée (intensité, flou, offset, couleur) | P0 | 1j | P1-007 |
| P1-012 | Fond personnalisé (couleur custom + image uploadée) | P1 | 2j | P1-007 |

**Livrable :** Beautification automatique complète avec aperçu temps réel.

### Sprint 1.3 (Semaines 13–14) — Presets, Format & Éditeur inline

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-013 | Implémenter les presets réseaux sociaux (Twitter/X, LinkedIn, FB, IG, YT) | P0 | 2j | P1-007 |
| P1-014 | Implémenter les presets standards (16:9, 4:3, 1:1, libre) | P0 | 1j | P1-013 |
| P1-015 | Presets personnalisés : création, sauvegarde, suppression | P1 | 2j | P1-013 |
| P1-016 | Redimensionnement et zoom de la capture dans le cadre (drag + scroll) | P0 | 2j | P1-007 |
| P1-017 | UI de l'éditeur inline : barre de style (fond, padding, radius, shadow) | P0 | 3j | P1-007, P0-009 |
| P1-018 | UI de la barre de presets rapides (icônes réseaux sociaux) | P1 | 1j | P1-013 |

**Livrable :** Éditeur inline complet avec presets et contrôles de style.

### Sprint 1.4 (Semaines 15–16) — Annotations

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-019 | Outil texte : insertion, police, taille, couleur, fond | P0 | 3j | P1-007 |
| P1-020 | Formes : rectangle, ellipse | P0 | 2j | P1-007 |
| P1-021 | Formes : flèche, ligne | P0 | 1j | P1-020 |
| P1-022 | Surbrillance (highlight semi-transparent) | P0 | 1j | P1-007 |
| P1-023 | Flou de zone (pixelisation ou blur gaussien) | P0 | 2j | P1-007 |
| P1-024 | Gestion des couches : sélection, déplacement, redimensionnement, suppression | P0 | 2j | P1-019 |
| P1-025 | Undo/Redo (historique d'actions) | P0 | 1j | P1-024 |

**Livrable :** Annotations complètes avec gestion des couches et undo/redo.

### Sprint 1.5 (Semaines 17–18) — Redaction & Export

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-026 | Moteur de détection on-device : emails, téléphones, cartes bancaires | P0 | 3j | P1-007 |
| P1-027 | Détection : clés API, URLs sensibles, mots de passe | P0 | 2j | P1-026 |
| P1-028 | UI de redaction : highlight des zones détectées, masquage 1-clic | P0 | 2j | P1-026 |
| P1-029 | Mode automatique : redaction globale activable dans les settings | P1 | 1j | P1-028, P0-016 |
| P1-030 | Export PNG (qualité max) | P0 | 1j | P1-007 |
| P1-031 | Export JPG (qualité configurable) + WebP | P0 | 1j | P1-030 |
| P1-032 | Copier dans le presse-papier (Cmd+C / Ctrl+C) | P0 | 1j | P1-030 |
| P1-033 | Glisser-déposer vers apps externes | P1 | 1j | P1-030 |

**Livrable :** Redaction fonctionnelle + export multi-format + copier/coller.

### Sprint 1.6 (Semaines 19–20) — Historique & Polish MVP

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| P1-034 | Historique des 30 dernières captures (stockage local + miniatures) | P0 | 2j | P0-006 |
| P1-035 | UI historique : grille, preview, réouverture dans l'éditeur | P0 | 2j | P1-034 |
| P1-036 | Tests d'intégration end-to-end : flux complet capture → beautify → export | P0 | 3j | Tous P1-* |
| P1-037 | Corrections de bugs et polish UX (feedback interne) | P0 | 3j | Tous P1-* |
| P1-038 | Optimisation performances : profiling, memory leaks, temps de rendu | P1 | 2j | Tous P1-* |
| P1-039 | Préparation des builds de release macOS (.dmg) + Windows (.msi/.exe) | P0 | 2j | P0-023 |

**Livrable :** MVP Desktop complet et testé, prêt pour la beta.

---

**Jalon J1 (fin M5) :** MVP multiplateforme complet (macOS + Windows). Toutes les features core fonctionnelles.

---

## 5. PHASE 1b — MVP Mobile (M4–M6)

> Objectif : proposer une app compagnon iOS et Android avec parité fonctionnelle sur la beautification.
> Note : démarrage en parallèle du Sprint 1.4 desktop.

### Sprint 1b.1 (Semaines 15–16) — Setup React Native & Capture mobile

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| M1-001 | Setup projet React Native (Expo) iOS + Android ; ajouter `dev:mobile` dans `mise.toml` | P0 | 2j | — |
| M1-002 | Implémenter Share Extension iOS (import depuis Photos/apps) | P0 | 3j | M1-001 |
| M1-003 | Implémenter Share Intent Android (import depuis Photos/apps) | P0 | 3j | M1-001 |
| M1-004 | Réutiliser les composants UI du design system (adaptation mobile) | P0 | 2j | P0-009, M1-001 |

### Sprint 1b.2 (Semaines 17–18) — Beautification & Presets mobile

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| M1-005 | Porter le moteur de beautification sur mobile (Canvas/Skia) | P0 | 4j | M1-001, P1-007 |
| M1-006 | Presets réseaux sociaux (format mobile) | P0 | 1j | M1-005 |
| M1-007 | Annotations tactiles : texte, formes, flou | P0 | 3j | M1-005 |
| M1-008 | Export : sauvegarde dans Photos, partage via sheet natif | P0 | 2j | M1-005 |

### Sprint 1b.3 (Semaines 19–20) — Polish & Tests mobile

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| M1-009 | Redaction de données sensibles (adaptation mobile) | P0 | 2j | M1-005, P1-026 |
| M1-010 | Tests sur devices réels (iPhone 14+, Pixel 7+, Samsung Galaxy S23+) | P0 | 3j | Tous M1-* |
| M1-011 | Optimisation performances mobile (temps de rendu, mémoire) | P1 | 2j | Tous M1-* |
| M1-012 | Préparation submission App Store + Google Play | P0 | 2j | Tous M1-* |

### Sprint 1b.4 (Semaines 21–22) — Soumission & Corrections

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| M1-013 | Soumission App Store (review Apple) | P0 | — | M1-012 |
| M1-014 | Soumission Google Play | P0 | — | M1-012 |
| M1-015 | Corrections post-review et ajustements | P0 | 3j | M1-013, M1-014 |
| M1-016 | Publication et monitoring | P0 | 1j | M1-015 |

**Livrable :** Apps iOS et Android publiées avec parité beautification.

---

## 6. PHASE 2 — Lancement (M6)

> Objectif : beta fermée, feedback, puis lancement public coordonné.

### Sprint 2.1 (Semaines 23–24) — Beta fermée

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| L-001 | Déployer la beta fermée à 200 testeurs (waitlist) | P0 | 1j | P1-039, M1-016 |
| L-002 | Setup système de feedback in-app (formulaire + analytics) | P0 | 2j | P0-019 |
| L-003 | Triage et correction des bugs critiques remontés | P0 | 5j | L-001 |
| L-004 | Ajustements UX basés sur le feedback beta | P0 | 3j | L-001 |
| L-005 | Finaliser la landing page : vidéo démo, pricing, FAQ | P0 | 2j | P0-013 |

### Sprint 2.2 (Semaines 25–26) — Lancement public

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| L-006 | Préparer les assets Product Hunt (logo, tagline, screenshots, vidéo) | P0 | 2j | L-005 |
| L-007 | Préparer le deal AppSumo (page, pricing 19$ OTP, description) | P0 | 2j | L-005 |
| L-008 | Lancement Product Hunt (minuit PST) + monitoring | P0 | 1j | L-006 |
| L-009 | Activation AppSumo le même jour | P0 | 1j | L-007 |
| L-010 | Outreach : newsletters tech, Reddit (r/macapps, r/SideProject, r/webdev) | P1 | 2j | L-008 |
| L-011 | Teaser Twitter/X : "Before/After" visuels viraux | P1 | 1j | L-008 |
| L-012 | Monitoring : analytics, crash reports, support tickets | P0 | Continu | L-008 |

**Livrable :** SnapGlow lancé publiquement sur Product Hunt, AppSumo, et le site direct.

---

**Jalon J3 (M6) :** Lancement public — Product Hunt + AppSumo.

---

## 7. PHASE 2b — IA & Cloud (M7–M9)

> Objectif : ajouter l'intelligence artificielle, les captures avancées, et le cloud.

### Sprint 2b.1 (Semaines 27–28) — Suggestion de style IA

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| AI-001 | Entraîner/adapter un modèle de classification de contenu (code, UI, photo, texte) | P0 | 4j | — |
| AI-002 | Intégrer le modèle on-device (TF Lite macOS/Windows, Core ML macOS) | P0 | 3j | AI-001 |
| AI-003 | Mapper classification → presets de style recommandés | P0 | 2j | AI-001 |
| AI-004 | UI : badge "Suggested" + application en 1 clic | P0 | 1j | AI-003 |

### Sprint 2b.2 (Semaines 29–30) — OCR & Auto-crop

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| AI-005 | Intégrer Tesseract.js (cross-platform) pour OCR | P0 | 2j | — |
| AI-006 | Intégrer Apple Vision Framework (macOS) comme moteur OCR alternatif | P1 | 2j | — |
| AI-007 | UI : bouton "Copier le texte", sélection de zones de texte | P0 | 2j | AI-005 |
| AI-008 | Auto-crop : détection et suppression des espaces vides excessifs | P0 | 2j | P1-007 |
| AI-009 | Compression intelligente (mozjpeg + pngquant) | P1 | 2j | P1-030 |

### Sprint 2b.3 (Semaines 31–32) — Capture scrollante & GIF

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| AC-001 | Capture scrollante macOS (scroll automatique + assemblage) | P0 | 4j | P1-001 |
| AC-002 | Capture scrollante Windows | P0 | 4j | P1-002 |
| AC-003 | Capture différée (timer 3/5/10 secondes) | P1 | 1j | P1-001 |
| AC-004 | Capture de menu ouvert | P1 | 2j | P1-001 |

### Sprint 2b.4 (Semaines 33–34) — Capture vidéo/GIF

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| AC-005 | Enregistrement de zone d'écran (< 30s) — macOS | P0 | 3j | P1-001 |
| AC-006 | Enregistrement de zone d'écran — Windows | P0 | 3j | P1-002 |
| AC-007 | Encodage GIF optimisé (< 10MB pour 10s) | P0 | 2j | AC-005 |
| AC-008 | Export vidéo MP4 (H.264) | P1 | 2j | AC-005 |
| AC-009 | UI : contrôles d'enregistrement (start, stop, pause) | P0 | 1j | AC-005 |

### Sprint 2b.5 (Semaines 35–36) — Cloud & Partage

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| CL-001 | Setup backend API (Fastify) + PostgreSQL + Redis ; ajouter `dev:api` dans `mise.toml` | P0 | 3j | — |
| CL-002 | Setup stockage fichiers (Cloudflare R2) | P0 | 2j | CL-001 |
| CL-003 | Système d'authentification (Clerk/Auth0 — OAuth2) | P0 | 2j | CL-001 |
| CL-004 | Upload automatique + génération de lien partageable | P0 | 2j | CL-002 |
| CL-005 | Page de visualisation publique du lien partagé | P0 | 2j | CL-004 |
| CL-006 | Expiration configurable des liens (1h, 24h, 7j, permanent) | P1 | 1j | CL-004 |

### Sprint 2b.6 (Semaines 37–38) — Intégrations & Organisation

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| CL-007 | Intégration Slack (envoi direct depuis l'éditeur) | P0 | 2j | CL-003 |
| CL-008 | Intégration Notion | P1 | 2j | CL-003 |
| CL-009 | Intégration Linear | P1 | 2j | CL-003 |
| CL-010 | Intégration GitHub Issues | P1 | 2j | CL-003 |
| CL-011 | Watermark personnalisable (logo, nom, URL) | P1 | 2j | P1-007 |
| CL-012 | Bibliothèque de captures avec recherche full-text (OCR) | P0 | 3j | AI-005, P1-034 |
| CL-013 | Tags et collections | P1 | 2j | CL-012 |

**Livrable :** IA on-device, capture scrollante/GIF, cloud avec liens partageables, intégrations.

---

**Jalon J4 (M9) :** 1 000 utilisateurs payants. IA + Cloud opérationnels.

---

## 8. PHASE 3 — Team & B2B (M10–M14)

> Objectif : débloquer le segment B2B avec collaboration, workspaces, et API.

### Sprint 3.1–3.2 (Semaines 39–42) — Workspace & Gestion d'équipe

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| T-001 | Modèle de données multi-tenant (workspaces, rôles, invitations) | P0 | 4j | CL-001 |
| T-002 | UI gestion d'équipe : invitations, rôles (admin/éditeur/viewer) | P0 | 4j | T-001 |
| T-003 | Brand kit centralisé : couleurs, polices, logos partagés | P0 | 3j | T-001 |
| T-004 | SSO (SAML/OIDC) pour Team Pro | P1 | 3j | CL-003, T-001 |
| T-005 | Billing team : intégration Stripe (par siège/mois) | P0 | 3j | T-001 |

### Sprint 3.3–3.4 (Semaines 43–46) — Collaboration temps réel

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| T-006 | Serveur WebSocket pour collaboration en temps réel | P0 | 4j | CL-001 |
| T-007 | Annotations partagées (curseurs multiples, sync) | P0 | 5j | T-006, P1-024 |
| T-008 | Système de commentaires sur les captures | P0 | 3j | T-006 |
| T-009 | Notifications (in-app + email) sur les commentaires/mentions | P1 | 2j | T-008 |

### Sprint 3.5–3.6 (Semaines 47–50) — API publique

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| T-010 | Concevoir l'API REST publique (OpenAPI spec) | P0 | 3j | CL-001 |
| T-011 | Endpoints : upload, beautify, export, list | P0 | 4j | T-010 |
| T-012 | Authentification API (API keys + rate limiting) | P0 | 2j | T-010 |
| T-013 | Documentation API interactive (Swagger UI / Redoc) | P0 | 2j | T-010 |
| T-014 | SDK JavaScript/TypeScript | P1 | 3j | T-011 |

### Sprint 3.7–3.8 (Semaines 51–54) — Plugins

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| T-015 | Plugin VS Code : capture depuis l'éditeur + beautification | P0 | 4j | T-011 |
| T-016 | Plugin Figma : import/export depuis Figma | P1 | 4j | T-011 |
| T-017 | Plugin Notion : embed enrichi dans les pages | P1 | 3j | T-011 |
| T-018 | Rapports d'utilisation team (captures/membre, exports, cloud usage) | P1 | 3j | T-001 |

### Sprint 3.9–3.10 (Semaines 55–58) — Polish & Stabilisation B2B

| ID | Tâche | Priorité | Estimation | Dépendance |
|---|---|---|---|---|
| T-019 | Tests de charge API (1000+ requêtes/min) | P0 | 2j | T-011 |
| T-020 | Audit sécurité (OWASP, pentest basique) | P0 | 3j | Tous T-* |
| T-021 | Onboarding team : wizard de setup workspace | P0 | 2j | T-002 |
| T-022 | Documentation utilisateur (help center / knowledge base) | P0 | 3j | — |
| T-023 | Corrections bugs et polish UX B2B | P0 | 4j | Tous T-* |

**Livrable :** Plans Team fonctionnels avec collaboration, API, plugins, et brand kit.

---

**Jalon J5 (M12–M14) :** 5 000 utilisateurs actifs. Plans Team lancés.

---

## 9. PHASE 4 — Scale (M15–M18)

> Objectif : scaler l'acquisition, internationaliser, et créer un écosystème.

### Sprints 4.1–4.8 (Semaines 59–74)

| ID | Tâche | Priorité | Période |
|---|---|---|---|
| S-001 | Marketplace de templates de beautification (communauté) | P1 | S59–62 |
| S-002 | Programme d'affiliés (30% commission, dashboard affilié) | P0 | S59–62 |
| S-003 | Localisation FR, DE, JP (UI + marketing) | P0 | S63–66 |
| S-004 | Intégrations entreprise avancées (Jira, Confluence, Teams) | P1 | S63–66 |
| S-005 | Synchronisation cross-device (captures + settings) | P0 | S67–70 |
| S-006 | Content marketing SEO : 2 articles/semaine | P0 | Continu |
| S-007 | Expansion Setapp + inclusion dans bundles partenaires | P1 | S67–70 |
| S-008 | Optimisation conversion : A/B tests pricing, onboarding, paywall | P0 | S71–74 |

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
