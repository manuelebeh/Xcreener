# Detailed checklist

Each item applies to the technology actually found. A non-applicable item is marked `NOT APPLICABLE` with the reason.

## References

- Security: OWASP ASVS 5.0.0, OWASP Top 10 2025, OWASP API Security Top 10 2023, OWASP MASVS 2 (mobile), OWASP WSTG, OWASP Cheat Sheets, OWASP Threat Modeling, NIST SSDF 1.1, CVSS 4.0, CIS Controls v8.1.
- Frontend: React 19 docs, TypeScript, TanStack Start / Router, WCAG 2.2.
- Tauri 2: security, capabilities, permissions, scopes, CSP, `withGlobalTauri`, asset protocol, plugins (sql, fs, opener, deep-link, updater, global-shortcut, clipboard, autostart, process).
- Rust: Clippy, RustSec (`cargo audit`), `cargo deny` (not set up in the repo).
- API: Fastify 5 (hooks, `bodyLimit`, multipart, websocket), `@fastify/helmet`, jose (JWKS), Drizzle, Stripe webhooks, OAuth 2.0 / PKCE (RFC 7636, RFC 8252 for native apps).
- Mobile: Expo SDK 56, Expo Router, EAS, deep links / universal links, share intents.
- Extensions: VS Code extension security (`SecretStorage`, webviews), Figma plugin sandbox (`code.ts` vs `ui.ts` iframe), Notion OAuth and embeds.
- Supply chain: GitHub Advisory DB, dependency review, SBOM, attestations/provenance.

Check current official docs for anything version-sensitive.

## 0. Discovery

Files to read beyond the code: `package.json` (root + apps + packages), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `mise.toml`, `biome.json`, `commitlint.config.cjs`, `.husky/`, `apps/desktop/src-tauri/{Cargo.toml,Cargo.lock,tauri.conf.json,capabilities/,Entitlements.plist,Info.plist}`, `rust-toolchain.toml`, `apps/api/{docker-compose.yml,drizzle/,drizzle.config.ts,openapi/public.yaml,scripts/,load/}`, `apps/mobile/{app.config.ts,eas.json}`, `apps/vscode-extension/package.json` (contributes, activation events), `apps/figma-plugin/manifest.json`, `.env.example` files (never put `.env` contents in the report), `.github/`, `tools/style-classifier`, README, `design.md`, `docs/internal/`.

Inventory to produce:
- **Desktop frontend**: React, TS, Vite, React Router, Zustand, `@tauri-apps/plugin-sql` from the WebView, i18n, PostHog, Sentry, modules under `src/modules/`.
- **Rust**: toolchain, edition, Tauri, the ~41 `#[tauri::command]`s, plugins, capture (xcap, ScreenCaptureKit, Windows GDI), OCR (Vision, Windows OCR, `tesseract` subprocess), tflite classification, image/video encoders (webp, gif, openh264, mp4), FFI/`unsafe`, overlay windows.
- **API**: Node version, Fastify, auth (Auth0 JWT, API keys), Drizzle/Postgres, Redis, S3/MinIO, Stripe, Rewardful, Resend/SMTP, OAuth integrations (Slack, Notion, Linear, GitHub, Atlassian, MS Teams), collab WebSocket, server-side rendering (`@napi-rs/canvas`).
- **Web**: TanStack Start on Nitro, public share/embed/collab viewers, blog/help Markdown, marketplace, affiliates, redeem.
- **Mobile, extensions, packages**: per app, what talks to the API, what stores credentials.
- **Infra**: hosting, reverse proxy, TLS, object storage, DB, Redis, secrets, monitoring, backups. Anything not in the repo → `UNVERIFIED`.

## 1. Data flows and trust boundaries

For each flow, record source, destination, data, sensitivity, protocol, authn, authz, validation, encryption, logging, retention, risk, boundary crossed:
- capture (screen pixels, window titles) → Rust → WebView → SQLite/FS → redaction/OCR → export/clipboard;
- desktop → API share upload (multipart) → S3 → public viewer `/s/:token` and embed `/e/:token`;
- desktop/web → collab WebSocket → Postgres → other participants;
- desktop/mobile → cross-device sync (`sync-core`, `/v1/sync`) → other devices;
- third-party OAuth (integrations) → API token exchange → desktop storage → provider APIs (Slack, Notion, Linear, GitHub, Jira);
- API keys → public API (SDK, VS Code, Figma, Notion embed) → workspace data;
- Stripe / Rewardful webhooks → API → plan/billing state;
- marketplace templates (user-submitted) → other users' editors and renderers.

Minimum boundaries: WebView ↔ Rust; OS (screen, other apps' windows, clipboard, deep links) ↔ desktop; desktop/mobile/extensions ↔ Internet; Internet ↔ API; API ↔ Postgres/Redis/S3; API ↔ third parties; anonymous viewer ↔ shared content; CI ↔ artifacts ↔ users.

## 2. Architecture

Separation of concerns, coupling, cohesion, modularity, testability, error handling, data and communication architecture. Compare against `.claude/rules/*.md` (desktop `modules/` + `src/tauri/commands.ts`, Fastify layout in `api-architecture.md`, `packages-architecture.md`, mobile, web) and ADRs 001-018.

Look for: god components/routes/services (`routes/collab.ts` is large), business logic in the UI, duplication between desktop, mobile, web and packages (`*-core` boundaries respected?), circular dependencies, needless abstraction, over/under-engineering. Do not impose Clean/Hexagonal/DDD without a gain.

## 3. WebView → Rust trust model

For each exposed command and plugin permission: name, inputs, validation, authorization, capability, scope, FS/network/process access, returned data, errors, logging.

Check: which windows can call it (`main` and `capture-overlay` share one capability), overly broad permissions, home directory access, shell, uncontrolled arguments and paths, external navigation, remote content. Principle: a compromised WebView (XSS through rendered content, malicious JS dependency, malicious marketplace template) must get no more than strictly needed. With `withGlobalTauri: true`, any script in the WebView reaches `window.__TAURI__`.

## 4. Tauri / desktop security

- **Capabilities**: minimal, split per window, explicit scopes. `sql:allow-execute` gives the WebView arbitrary SQL on the local DB; `fs:allow-remove` / `allow-write-file` with `$APPDATA`, `$TEMP`, `$TMP` scopes.
- **Permissions** (opener, deep-link, updater, process, clipboard, global-shortcut, autostart, dialog): why, needed, too broad, attack if the WebView is compromised.
- **IPC**: Rust-side validation of paths, sizes, formats, IDs; errors leaking paths.
- **CSP**: every directive; `'unsafe-inline'` styles, `connect-src` including `http://localhost:8787` and many third parties in production builds, asset protocol scope.
- **Remote content**: share previews, marketplace templates, collab documents, integration responses rendered in a WebView with IPC access.
- **Navigation and deep links**: `snapglow://` handlers (cloud auth, integrations callback, referral). Any app can register or call the scheme: state/PKCE checks, replayed callbacks, attacker-crafted links triggering actions.
- **Screen capture privacy**: macOS screen-recording entitlement, private APIs (`macOSPrivateApi`), overlay windows on all workspaces, captures of other apps' content (passwords, notifications), redaction before upload or share.
- **Command execution**: `Command::new("tesseract")` (PATH resolution, arguments, temp files). Any other process spawn.
- **Filesystem**: export paths, temp files, overwrite, traversal, symlinks, permissions of captures on disk, cleanup.
- **Local secrets**: Auth0 tokens and integration tokens in SQLite settings, clipboard, logs; keychain not used?
- **Updates**: Tauri updater minisign pubkey, endpoint (`github.com/.../releases/latest/download/latest.json`), private key storage in CI, downgrade, repo name mismatch (ScreenCut vs SnapGlow).
- **Code signing**: macOS (Developer ID, notarization, entitlements, Hardened Runtime; Apple secrets commented out in `release.yml`), Windows (Authenticode), Linux.

## 5. React / TypeScript (desktop, web, mobile)

- Architecture: UI vs logic, hooks, services, API client, state, routing, forms, validation, prop drilling, misplaced state.
- State (Zustand, TanStack Query): server vs client state, invalidation, stale data, races, optimistic updates and rollback, editor history, collab merge.
- `useEffect`: loops, uncleaned subscriptions (Tauri `listen`, deep-link `onOpenUrl`, WebSockets), multiple fetches, derived state.
- Rendering: measure (React Profiler, production build) canvas/editor rendering, large images, history list virtualization. No `memo` without measurement.
- Bundle: initial size, chunks, lazy loading, heavy/duplicated deps, source maps, fonts, `@tanstack/*-devtools` excluded from production.
- Sinks: `dangerouslySetInnerHTML` (web blog/help Markdown renderer, Figma plugin `ui.ts`), SVG, dynamic URLs, `eval`/`new Function`, PostHog/Sentry, tokens in storage, user content (captions, annotations, template names, comments, OCR text).
- TypeScript: `any`, `as`, `!`, `@ts-ignore`; runtime validation of external data (IPC, API, sync payloads, deep-link params), not only compile-time types.

## 6. Fastify API

Inventory every route: method, path, authn (Auth0 JWT, API key, share token, none), authz (`requireWorkspaceRole`, `can()`), inputs, validation (Zod), DB, external services, output, errors, rate limit, logging. Look for wrong verbs/status codes, missing pagination, exposed docs (`/openapi.json`, Swagger UI), versioning, consistency with `openapi/public.yaml` and `packages/sdk`.

OWASP API Top 10 2023, each category with observed controls, weakness, evidence, scenario, impact, remediation:
API1 BOLA, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs.

- **Authentication**: Auth0 JWT (issuer, audience, algorithms, expiry, `email` trusted without `email_verified`?, org claims), API keys (format, hash, lookup, revocation, scopes, plan gate), WebSocket handshake auth and re-auth on expiry, share/embed capability tokens.
- **Authorization**: workspace RBAC (admin/editor/viewer), personal vs workspace captures, collections, templates, collab documents, notifications, sync records. For each `/:id`: is this caller allowed to access this exact object? Scenarios A→A, A→B, viewer→editor action, workspace A→workspace B, API key of A→B, moderator-only marketplace actions (`MARKETPLACE_MODERATOR_SUBS`).
- **Validation**: JSON, query, params, headers, multipart fields and files (type sniffing vs declared MIME, dimensions, decompression bombs in PNG/WebP/GIF), editor document state, enums, dates, lengths.
- **Injection**: Drizzle `sql` template usage, raw SQL, HTML in emails (Resend/SMTP notifications), headers.
- **SSRF**: any URL the server fetches (integrations, render sources, image imports, webhooks): private IPs, metadata, redirects, schemes.
- **Server-side rendering** (`services/render.ts`, `@napi-rs/canvas`, `render-core`): untrusted document state and images rendered on the server (CPU/memory per render, image bombs, font loading, timeouts).
- **CORS, headers**: `@fastify/helmet` with CSP/HSTS only in production, `CORS_ORIGINS` allowlist (empty default?), `credentials: true`, `frame-ancestors` on embeds.
- **Rate limiting** (Redis, general/upload/export): coverage of public share creation, embeds, auth-adjacent flows, invitations, integrations, marketplace submissions, affiliates/redeem; key choice (user/IP/API key), `trustProxy` and `X-Forwarded-For`, Redis down (fail open/closed).
- **Resource exhaustion**: global `bodyLimit` 100 MB on every route (JSON included), WebSocket message size and rate, pagination, storage quotas per plan.
- **Webhooks**: Stripe signature with raw body, Rewardful secret check, idempotency, replay, event ordering.

## 7. Database

Postgres (Drizzle `apps/api/drizzle/`, `src/db/schema.ts`) and desktop SQLite (`apps/desktop/src/db/`, `tauri-plugin-sql` preload `snapglow.db`). Schema (FKs, uniqueness, constraints, nullability, types, IDs, timestamps), indexes (`EXPLAIN ANALYZE` on library listing, share lookup by token, sync pull by cursor, collab ops), queries (N+1, `SELECT *`, offset pagination), transactions (atomicity, idempotency, concurrency for collab ops and sync), migrations (reversibility, destructive steps, zero-downtime, how desktop SQLite migrations run). DB security: runtime user privileges, TLS, network exposure, backups.

## 8. Rust quality and security

Ownership, async, concurrency, locks, channels, typed errors vs `String`, panics, `unsafe` (count it: objc2, windows crate, ScreenCaptureKit, overlay code), FFI. For each `unsafe`: why, invariant, documented or not, safer alternative. Look for `unwrap`/`expect`, `panic!`, `todo!`, `unimplemented!`.

Async: blocking capture, OCR, tflite, image/video encoding on the async runtime or main thread, `spawn_blocking`, large buffers copied across IPC, memory during screen recording, cancellation.

Errors exposed to the WebView: paths, OS details.

## 9. API code quality

Typing (`tsc` strict?), async error handling in Fastify hooks (early `reply.send` without `return`), service vs route boundaries, configuration (`env.ts` with t3-env, many optional secrets defaulting to `''`: does the feature fail closed when unset?), testability (vitest with Postgres/Redis).

## 10. Dependencies and supply chain

pnpm, Cargo, Expo/EAS, VS Code Marketplace (`vsce`), Figma, Docker images (`minio/minio:latest`), GitHub Actions, third-party SDKs. CVEs and advisories (reachability), outdated versions, abandoned packages, unpinned versions, duplicates, transitives. Licenses (MIT, Apache, BSD, GPL/LGPL/AGPL, unknown) and implications for distributing desktop/mobile/extension binaries (openh264 codec licensing, tflite models, tesseract). Lockfiles: `--frozen-lockfile` in CI, one package manager (`vscode-extension.yml` uses Node 22 while the repo requires `>=24`).

CI: actions pinned by SHA, per-job `permissions`, secrets (`TAURI_SIGNING_PRIVATE_KEY`, `VSCE_PAT`, `EXPO_TOKEN`), `pull_request_target`, forks, cache poisoning, artifacts, dependency review, release automation.

## 11. Secrets

Search for `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN`, `PRIVATE_KEY`, `CLIENT_SECRET`, `DATABASE_URL`, `AWS_`, `S3_`, `STRIPE`, `sk_`, `pk_`, `ghp_`, `AKIA`, `whsec_` in tracked files, fixtures, `.env.example`, logs, and git history (`gitleaks` if available). Weak defaults (`snapglow/snapglow`, `minioadmin`) are acceptable locally only if deployed config rejects them. Public keys (updater pubkey, Auth0 client IDs, PostHog keys) are not secrets: say so.

## 12. Personal data and privacy

SnapGlow claims "privacy-first: no telemetry, no cloud upload without explicit user action". Verify the claim in code: analytics opt-in default (`isAnalyticsActive`), Sentry before consent, what PostHog events carry, OCR text and window titles stored or sent, auto-sync without explicit action, share links indexed or guessable, redaction applied before upload, data in crash reports. Inventory: which data, where stored, encrypted, retention, shared (PostHog, Sentry, Stripe, Auth0, Rewardful, integrations), deletable (account deletion, share revocation, S3 objects). Legal compliance: "to be verified legally depending on country and context", never concluded automatically.

## 13. Cryptography and randomness

Share/embed/state tokens (`nanoid` `customAlphabet`, 12 chars base36 ≈ 62 bits), API key generation and hashing (SHA-256 for high-entropy keys is fine; check comparison and prefix), PKCE (`createCodeVerifier`, `createOAuthState`), invite tokens, Stripe signature, updater signature. Look for `Math.random()` in security use, home-made crypto, hardcoded secrets.

## 14. Network

Plaintext HTTP (`http://localhost:8787` in production CSP and defaults), TLS validation, hardcoded URLs, timeouts on `fetch` (desktop, API outbound to providers), retries/backoff, request/response sizes, WebSocket reconnect storms, duplicated mutations on retry (uploads, sync push).

## 15. Performance (measure)

- Desktop: cold/warm startup, idle CPU/memory (menu-bar app always running), capture latency (hotkey → overlay → image in editor), OCR and tflite time, export time per format, memory during screen recording, large history.
- IPC: image payloads over IPC (base64 vs asset protocol vs file path), calls in loops.
- API: p50/p95/p99 on uploads, share view, sync, collab; use `mise run load:api` (k6 baseline) against localhost only.
- Rendering: server-side render time and memory per export.
- DB: slow queries, full scans, over-fetching.
- Web: public viewer TTFB and LCP (image size, caching, CDN headers), bundle size.
- Mobile: startup, editor (Skia) frame rate, memory with large images.

Format: current measurement, target, evidence, cause, impact, fix, expected gain, verification.

## 16. Reliability and concurrency

Behavior when: no Internet, API slow/500/429/timeout, S3 down, Redis down, Rust panic, WebView reload, restart mid-recording, disk full, screen-recording permission denied or revoked, multiple monitors and DPI changes, corrupted SQLite, failed update. Retry, backoff, timeout, cancellation, offline mode, idempotency, rollback.

Concurrency: double hotkey press, two captures in parallel, two windows writing settings, two devices syncing the same item, concurrent collab edits (ordering, conflicts), duplicate webhook deliveries.

## 17. Observability and errors

Structured logs (Fastify pino), request IDs, metrics, traces, Sentry (desktop, web), health/readiness, alerts. Logs must tell who/when/where/what/result without tokens, share tokens, or image content. Errors: silent `catch {}`, generic, exposed stack traces. Target: actionable internally, safe externally, traceable.

## 18. Tests

Existing tests: vitest (desktop, API, packages), Playwright (`apps/desktop/e2e`), native E2E (wdio, `e2e-native.yml`), API load (k6, `api-load.yml`), Rust tests, mobile. Functional and security coverage: untested critical paths (authz on every route, share expiry, API key revocation, collab role enforcement, webhooks, sync conflicts, IPC FS scope, redaction). Expected security tests: IDOR, escalation, CORS, rate limits, token expiry, upload validation. Fuzzing/property-based candidates: image decoders, editor document parsing, collab op application, sync merge, Markdown renderer.

## 19. Accessibility and technical UX

WCAG 2.2 on critical paths with the keyboard only: capture overlay (keyboard-only region selection?), editor tools, dialogs, focus, labels, contrast, screen reader announcements, reduced motion. Compare with `docs/internal/technical/accessibility-audit.md`. Technical UX: feedback after capture/copy/share, destructive confirmations (delete, revoke), loading/empty/offline/error states, data loss on crash.

## 20. API contracts, dates, i18n, configuration

- Contracts: `openapi/public.yaml`, `packages/sdk`, `api-core` Zod schemas vs real responses. Cases where TypeScript says A and the API returns B.
- Dates: share expiry, sync cursors, UTC vs local.
- i18n: `@snapglow/i18n` missing keys (`mise run i18n:check`), fallback, plurals, formats.
- Configuration: dev/test/prod, separated secrets, dangerous defaults, hardcoded URLs/ports, permissive CORS, devtools in production.

## 21. Build, release, deployment, backups

Pipeline commit → lint → test → build → sign → release → update for desktop (`release.yml`, tauri-action), mobile (EAS), VS Code extension (`vsce`), web/API (no deploy workflow in the repo: hosting `UNVERIFIED`). Reproducibility, versioning, checksums, signatures, provenance, permissions, rollback. Backups of Postgres and S3: frequency, encryption, retention, restore tested, RPO/RTO. Outside the repo → `UNVERIFIED`.

## 22. Business logic

For each important feature (capture, share with expiry, embeds, workspaces/invitations, billing plans and limits, API access gate, collab, marketplace publish/moderation, affiliates and redeem codes, licensing, sync): initial state, allowed and forbidden transitions. Look for plan limits enforced only on the client, redeem/referral abuse, share expiry bypass, moderation bypass, replay, negative values, ID tampering.

## 23. Threat model (STRIDE)

- Assets: screenshots and recordings (may contain secrets of anything on screen), OCR text, share links, Auth0 tokens, integration tokens, API keys, Stripe state, workspace data, signing keys (Tauri updater, Apple, Windows, VSCE, Expo), DB, S3 bucket.
- Actors: anonymous Internet user, link recipient, malicious workspace member, malicious template author, compromised account, malicious local app (deep links, other processes reading SQLite), malicious website (CORS, embeds), compromised dependency, compromised CI runner, insider.
- Surfaces: WebView, IPC, plugins, deep links, cloud API, WebSocket, public viewers, embeds, webhooks, integrations, updates, FS, CI/CD, extensions.

## 24. Hybrid app anti-patterns

1. React trusts Rust without handling its errors. 2. Rust trusts the frontend for permissions or paths. 3. The WebView holds far more privileges than needed (raw SQL, broad FS). 4. The API trusts client data (plan, role, workspace ID, sizes). 5. Everything goes through the cloud when local would do (contradicts privacy-first). 6. Frontend state as the source of truth for server data. 7. Permission checks only in the UI. 8. Shared packages that leak server-only logic into clients.

## 25. Cross-layer attack chains to reason about

- malicious marketplace template or collab document → editor render in the desktop WebView → `window.__TAURI__` → SQL/FS/clipboard/opener;
- crafted `snapglow://` link from a web page or another app → deep-link handler → login CSRF, integration token swap, referral fraud;
- leaked or guessed share token → public viewer → screenshot containing secrets;
- API key of workspace A → public API → objects of workspace B;
- compromised dependency in a shared `*-core` package → desktop, mobile, web, API, and extensions at once;
- CI or GitHub release compromise → `latest.json` + signed artifact → user machines (only if the minisign key also leaks).

## 26. Static analysis patterns

`eval`, `new Function`, `dangerouslySetInnerHTML`, `innerHTML`, `unsafe`, `unwrap`, `expect`, `#[allow(`, `any`, `@ts-ignore`, `Command::new`, `std::process`, `` sql` ``, `db.execute(`, `Math.random`, `fetch(` with dynamic URLs, `rejectUnauthorized: false`, `localStorage`, hardcoded secrets. Analyze each occurrence in context; it is not a finding by default.

## 27. Maintainability, docs, DX

Code smells (long files such as `routes/collab.ts`, deep nesting, duplication, magic values, dead code, critical TODOs). Docs vs actual code (README, `AGENTS.md`, `design.md`, ADRs, env vars in `.env.example` files, `security-audit-2026-06.md` claims). Can a new developer go from `git clone` to "app running, tests green" with the mise tasks and no implicit knowledge? Many packages: are they all used, built, and tested?
