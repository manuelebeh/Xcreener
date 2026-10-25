---
name: platform-audit
description: Full, evidence-based technical audit of the SnapGlow platform (Tauri 2 + React desktop app with Rust capture/OCR, TanStack Start web app and public share viewer, Fastify API with Auth0, Postgres, Redis, S3, Stripe, collab WebSocket, Expo mobile app, VS Code / Figma / Notion plugins, shared packages, CI). Covers security, performance, architecture, reliability, testing, observability, privacy. Use when the user asks for an audit, a whole-platform security review, a production-readiness check, a threat model, or a "full audit". Accepts an optional scope argument (desktop, rust, web, api, mobile, plugins, packages, ci, all).
---

# SnapGlow platform audit

Act as a Senior Software Architect, Application Security Engineer, DevSecOps Engineer, Performance Engineer, and TypeScript / React / Tauri / Rust / Fastify / React Native engineer.

Goal: a **real audit of this repository**, not a best-practices essay. For each area, determine what is well designed, what works but can improve, bad practices, likely bugs or regressions, security issues, performance problems, technical debt, scaling risks, what is missing for serious production use, and in what order to fix things.

SnapGlow captures **whatever is on the user's screen** (passwords, private messages, customer data), sells itself as **privacy-first**, and turns captures into **public links**. Weigh findings with that in mind, and check the privacy claims in code.

## Scope (argument)

- `all` (default): every app, package, and pipeline, then cross-part correlation.
- `desktop`: `apps/desktop/src` (React, modules, SQLite through `tauri-plugin-sql`, deep links, observability) and `src-tauri` config (capabilities, CSP, updater, entitlements).
- `rust`: `apps/desktop/src-tauri/src` (commands, capture, overlay, OCR, classification, image/video processing, redaction, `unsafe`).
- `web`: `apps/web` (TanStack Start on Nitro, share/embed/collab viewers, blog/help, marketplace, affiliates, redeem).
- `api`: `apps/api` (Fastify routes, plugins, services, Drizzle schema and migrations, docker-compose, OpenAPI, load tests).
- `mobile`: `apps/mobile` (Expo).
- `plugins`: `apps/vscode-extension`, `apps/figma-plugin`, `apps/notion-embed`.
- `packages`: `packages/*` (shared domain cores, SDK, UI, tokens, i18n).
- `ci`: `.github/`, release and signing, supply chain.

A partial scope uses the same report format, limited to the relevant sections, and lists the other parts under "Unknown / Unverified".

## Actual system (verified in the repo; re-check at audit time)

Never assume: re-read manifests, `AGENTS.md`, `README.md`, `design.md`, ADRs in `docs/architecture/adr/`, and `docs/architecture/desktop-stack.md` at the start of every audit; versions move. The repo folder is `screen-cut`, the GitHub repo `ScreenCut`, the product **SnapGlow**: same project.

| Part | Location | Observed stack |
|---|---|---|
| Desktop UI | `apps/desktop/src` (`modules/{balance,capture,cloud,collab,editor,export,history,integrations,licensing,marketplace,redaction,settings,style-suggestion,team,text-extraction}`, `db/`, `tauri/commands.ts`, `integrations/observability.ts`) | React 19, Vite, React Router, Zustand, Zod, `@tauri-apps/plugin-sql` (SQL from the WebView), PostHog, Sentry, i18n, Playwright + wdio native E2E |
| Desktop Rust | `apps/desktop/src-tauri/src` (`commands/`, `capture/`, `overlay*.rs`, `ocr/`, `classification/`, `image_processing/`, `redaction/`, `shortcuts.rs`, `tray.rs`) | Tauri 2 (`withGlobalTauri`, `macOSPrivateApi`, asset protocol), ~41 commands, plugins sql/fs/opener/deep-link/updater/process/clipboard/global-shortcut/autostart/dialog, xcap + ScreenCaptureKit, Vision / Windows OCR / `tesseract` CLI, tract-tflite, imagequant/webp/gif/openh264/mp4, capabilities `default.json` (window `main`) and `overlay.json` (window `capture-overlay`), deep-link scheme `snapglow`, updater on GitHub releases (minisign) |
| Web | `apps/web/src` (`routes/{s,e,c,blog,help,marketplace,auth}`, `affiliates.tsx`, `redeem.tsx`, `sitemap.xml.ts`) | TanStack Start + Nitro, TanStack Query, Tailwind 4, Sentry, PostHog, t3-env |
| API | `apps/api/src` (`app.ts`, `env.ts`, `routes/`, `plugins/{auth,api-key-auth,workspace-auth,collab-ws,stripe-webhook,openapi-docs}`, `services/{storage,redis,render,collab-room,collab-ops,notifications,auth0-management}`, `db/schema.ts`), `drizzle/` migrations 0000-0007, `openapi/public.yaml` | Fastify 5, `@fastify/{helmet,cors,multipart,websocket,swagger-ui}`, jose (Auth0 JWKS), API keys (SHA-256), Drizzle + postgres.js, ioredis (rate limits), S3 SDK (MinIO locally), Stripe, Rewardful, Resend/SMTP, OAuth integrations (Slack, Notion, Linear, GitHub, Atlassian, MS Teams), `@napi-rs/canvas` server rendering, k6 load tests |
| Mobile | `apps/mobile` (`app/`, `app.config.ts`, EAS) | Expo SDK 56, Expo Router, Skia, share intent, media library, AsyncStorage, scheme `snapglow` |
| Plugins | `apps/vscode-extension`, `apps/figma-plugin`, `apps/notion-embed` | VS Code `SecretStorage` API key, Figma plugin (`code.ts` + `ui.ts`), standalone Node server for Notion OAuth/embeds |
| Packages | `packages/{api-core,cloud-core,collab-core,editor-core,integrations-core,marketplace-core,ocr-core,plugin-core,redaction-core,render-core,style-suggestion-core,sync-core,team-core,sdk,ui,ui-native,design-tokens,i18n,typescript-config,biome-config}` | Shared domain logic used by desktop, web, mobile, API, and plugins |
| Tooling | `tools/style-classifier` | Python dataset/model tooling for the style classifier |
| CI | `.github/workflows/{ci,build,release,e2e-native,api-load,mobile-build,vscode-extension}.yml` | mise, Turborepo, tauri-action, EAS, vsce; no API/web deploy workflow |

Prior work to check against code: `docs/internal/audits/security-audit-2026-06.md` (API only), `docs/quality/accessibility-audit.md`, `docs/guides/release-signing*.md`, `.claude/rules/*.md`.

## Non-negotiable rules

1. **Read-only.** Do not modify any project file. The only allowed write is the report (see Deliverable). No `pnpm audit --fix`, `pnpm update`, `cargo update`, `drizzle-kit push`, migrations against shared databases, data deletion, or refactors.
2. **No destructive commands**, no testing against production, Auth0, Stripe, S3/R2, GitHub releases, app stores, or other third-party infrastructure. Active tests only against localhost (`mise run dev:api` with its docker-compose, `mise run dev:web`, `mise run dev:desktop`). Stripe only in test mode with the CLI, if the user agrees.
3. **Every conclusion carries a status**: `OBSERVED` (seen in code/config), `VERIFIED` (confirmed by a command or test), `INFERRED`, `POSSIBLE`, `UNVERIFIED` (with the procedure to verify). Never present a hypothesis as fact. Windows/Linux capture and signing cannot be verified on macOS: say so.
4. **Measure before claiming** slowness. No "probably slow". Do not flag missing `memo` or caching without context.
5. **Threat model before controls**: each security recommendation states the threat, control, residual risk, and operational cost.
6. **No over-engineering**: no microservices/Kafka/service mesh/CQRS/GraphQL without a real problem, cost, gain, and "why now". Respect ADR decisions unless evidence contradicts them.
7. **Root cause**: group symptoms with the same cause into one systemic finding with a list of affected locations.
8. **Secrets**: never copy a value. Redact (`sk_****`). Report type, file, line, committed or not, recommended rotation. Local `.env*` files may exist: confirm they are gitignored and never tracked; do not print them.
9. **Current official docs** for anything version-sensitive (Tauri 2, Fastify 5, TanStack Start, Expo 56, Drizzle, Auth0, Stripe, OWASP). Use the context7 MCP or WebFetch when available rather than memory.
10. Do not stop at the first critical issue: cover every part, then attacks that cross them.

## Repo tooling (prefer these commands)

Use `mise run …` or `pnpm` (never `npm` / `yarn`). Use CodeGraph (`codegraph_explore`) to trace code across TS and Rust before grepping.

```bash
# Inventory / state
git status && git log --oneline -20 && git ls-files | wc -l
git ls-files | grep -iE '\.env|\.key|\.pem|\.p12|\.tauri' ; git log --all --oneline -- '*.env*' '.tauri/*'

# Lint / types / tests
mise run lint
mise run typecheck
mise run test
mise run i18n:check
pnpm --filter @snapglow/api test        # needs Postgres + Redis (mise run api:infra)
pnpm --filter @snapglow/desktop test:e2e
(cd apps/desktop/src-tauri && cargo clippy --all-targets -- -D warnings && cargo test)

# Local stack
mise run api:infra && pnpm --filter @snapglow/api db:migrate
mise run dev:api            # :8787
mise run load:api           # k6 baseline, localhost only

# Supply chain
pnpm audit --prod
pnpm outdated -r
(cd apps/desktop/src-tauri && cargo audit)   # if installed
bash apps/api/scripts/security-scan.sh       # pnpm audit + optional ZAP baseline on localhost

# Bundles
pnpm --filter @snapglow/desktop build && du -sh apps/desktop/dist/assets/* | sort -h | tail
pnpm --filter @snapglow/web build
```

If a tool is missing (gitleaks, osv-scanner, cargo-audit, cargo-deny, trivy, k6, semgrep), say so and give the command; do not install globally without consent.

## Procedure

Follow the steps in order. Per-step detail is in [references/checklist.md](references/checklist.md); SnapGlow-specific leads to check first are in `docs/internal/audits/snapglow-hotspots.md` (gitignored, so only on the maintainer's machine; skip this if it is missing).

1. Repository discovery and inventory of actual versions (lockfiles included).
2. Architecture and data flow mapping (logical DFD), including capture → edit → share/sync/collab.
3. Trust boundaries and boundary matrix.
4. Dependency inventory (pnpm, Cargo, Expo, plugins).
5. Static analysis (dangerous patterns, in context).
6. Security audit: Tauri capabilities and IPC, local secrets, deep links, updater/signing, Rust, API (OWASP API Top 10 2023), auth (Auth0, API keys, WebSocket, share tokens), web viewers, mobile (MASVS), plugins, secrets, privacy claims.
7. Non-destructive dynamic tests (localhost only).
8. Performance measurements (desktop startup/idle/capture latency, IPC payloads, API, server rendering, DB, bundles, mobile).
9. Database (Postgres schema, indexes, `EXPLAIN ANALYZE`, Drizzle migrations; desktop SQLite).
10. Infra, CI, release, signing, supply chain.
11. Reliability, concurrency, offline behavior, error handling.
12. Existing and missing tests.
13. Accessibility (WCAG 2.2) and technical UX, including the capture overlay and editor.
14. Findings correlation, root causes, prioritization, roadmap.

For an `all` audit in Claude Code, you may parallelize steps 5 to 13 per part (desktop, rust, web, api, mobile, plugins, packages/ci) with subagents if the user agrees, then do the correlation (step 14) yourself. Each subagent gets this SKILL.md, the checklist, and the same rules.

## Deliverable

Write the report to `docs/internal/audits/<YYYY-MM-DD>-platform-audit[-<scope>].md` (the only file created). Structure, finding format, severities, CVSS 4.0, P0-P3 priorities, and closing sections: [references/report-template.md](references/report-template.md). Follow it exactly.

At the end of the conversation, give a few lines: verdict, top 3 actions, report path, and what could not be verified.
