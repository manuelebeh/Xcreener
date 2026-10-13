# SnapGlow-specific leads

Spotted while writing this skill. These are **leads, not findings**: each starts as `POSSIBLE` and must be confirmed or dismissed with evidence. The code may have changed since.

A previous API-only audit exists: `docs/internal/technical/security-audit-2026-06.md` (2026-06-27). Re-verify every item it marks `Fixed`, `Accepted`, or `OK` against current code instead of copying its conclusions. It left the desktop, mobile, and extension surfaces out of scope.

## Desktop (Tauri 2)

- **WebView privileges** (`src-tauri/capabilities/default.json`, `tauri.conf.json`): one capability for both `main` and `capture-overlay`; `sql:allow-execute` (arbitrary SQL from JS on `snapglow.db`), `fs:allow-remove` / `allow-write-file` / `allow-copy-file` on `$APPDATA/**`, `$TEMP/**`, `$TMP/**`, `opener:default`, `process:default`, `clipboard-manager`. `withGlobalTauri: true` exposes `window.__TAURI__` to any script. What does an XSS (rendered template, collab document, share preview, OCR text) get?
- **Tokens in plaintext SQLite**: Auth0 access + refresh tokens (`modules/cloud/tokenStorage.ts`) and integration tokens (`modules/integrations/tokenStorage.ts`) go through `getSetting` / settings table. Readable by any local process running as the user and by any WebView script through `sql:allow-execute`. OS keychain not used.
- **Stub commands**: `commands/storage.rs` `get_setting` / `set_setting` always return an error ("Sprint 0.3"). Dead IPC surface, or something still calls them?
- **Deep links** (`snapglow://`): `useCloudAuthListener` (Auth0 PKCE callback, state checked against an in-memory `pendingLogin`), `useIntegrationsListener` (integration OAuth callback, default `INTEGRATIONS_REDIRECT_URI=snapglow://integrations/callback`), `useReferralDeepLink`. Custom schemes can be registered by another app (RFC 8252 prefers claimed HTTPS or loopback redirects): code interception for integrations that do not use PKCE; does the API bind integration `state` to the user who started the flow? What happens with a link arriving at cold start (`getCurrent()`)?
- **CSP** in production: `connect-src` includes `http://localhost:8787` and `http://127.0.0.1:8787`, plus GitHub, Auth0, Slack, Notion, Linear, PostHog, Sentry. `style-src 'unsafe-inline'`. Assess what a script could exfiltrate to and whether a dev-only config is shipped.
- **`macOSPrivateApi: true`** and an always-on-top transparent overlay on all workspaces: App Store / notarization implications, click-jacking of the overlay, focus stealing.
- **`tesseract` subprocess** (`ocr/tesseract.rs`): resolved from `PATH`, arguments, temp file handling.
- **`unsafe`** (~11 occurrences across capture, overlay, OCR FFI): invariants documented?
- **Updater**: endpoint `github.com/manuelebeh/ScreenCut/releases/latest/download/latest.json` (repo name differs from product name: renamed repo, redirect, takeover risk if the old name is freed?), minisign pubkey in config (good), `TAURI_SIGNING_PRIVATE_KEY` in CI secrets; `dialog: true`. Apple and Windows signing secrets are commented out in `release.yml`: unsigned/un-notarized builds shipped?
- **Privacy claims** (`AGENTS.md`: "no telemetry, no cloud upload without explicit user action"): PostHog/Sentry gated by `isAnalyticsActive(analyticsEnabled)`; check the default value of `analyticsEnabled`, what events and properties are sent, Sentry breadcrumbs carrying file paths or OCR text, and whether sync (`modules/cloud/syncPull.ts`) runs without an explicit action.

## API (Fastify)

- **Global `bodyLimit: 100 MB`** applies to every route, including JSON endpoints, not just uploads. Combined with multipart `fileSize` 100 MB and server-side rendering (`@napi-rs/canvas`), check memory per request and image decompression bombs.
- **Share / public capture tokens**: `customAlphabet(base36, 12)` ≈ 62 bits (`routes/shares.ts`, `routes/public-captures.ts`). Enough against online guessing if rate limited; check rate limiting on `/v1/shares/:token` and `/v1/embeds/:token`, expiry enforcement on every path that serves the image (including direct S3/presigned URLs), revocation, `noindex`, referrer leakage.
- **Auth0 JWT** (`plugins/auth.ts`): `email` claim copied into `users.email` on every request without checking `email_verified`. Does anything authorize by email (invitations, workspace membership, marketplace moderation)? `org_id` / `orgId` claims accepted from either name.
- **API keys** (`plugins/api-key-auth.ts`): SHA-256 lookup by hash (constant-time compare not needed for an indexed hash lookup, but check), plan gate via `hasApiAccess`, scopes (read vs write?), last-used tracking, key management routes callable with an API key?
- **Collab WebSocket** (`plugins/collab-ws.ts`): JWT on the first message, role check for `collab:edit`. Check Origin validation (cross-site WebSocket hijacking is moot with bearer tokens but verify), max message size, rate per socket, token expiry during a long session, revoked membership disconnecting live sockets, doc size growth.
- **Web collab route** `/c/$documentId`: document ID in the URL; can a non-member open it? What does the viewer page fetch without auth?
- **CORS** (`lib/cors.ts`): `CORS_ORIGINS` defaults to `''`; what does `isOriginAllowed` do with no origin (desktop, curl) and an empty allowlist? `credentials: true` with bearer tokens is unnecessary.
- **Helmet**: CSP and HSTS only when `NODE_ENV === 'production'`; staging runs without them?
- **OpenAPI docs** registered whenever `NODE_ENV !== 'test'`, so in production.
- **Integrations OAuth** (`routes/integrations.ts`): client secrets for Slack, Notion, Linear, GitHub, Atlassian, MS Teams live in the API; access tokens are returned to the desktop and stored there. Refresh, revocation, scopes requested, `state` validation server-side.
- **Webhooks**: Stripe signature (`plugins/stripe-webhook.ts`), Rewardful (`routes/affiliates.ts`, `REWARDFUL_WEBHOOK_SECRET` defaults to `''`: does verification fail closed when unset?). Idempotency on retries.
- **Marketplace moderation**: `MARKETPLACE_MODERATOR_SUBS` env list of Auth0 subs; template content rendered in other users' editors (desktop WebView, web) and on the server.
- **Optional secrets defaulting to `''`** in `env.ts` (Stripe, Rewardful, Auth0 management, Resend, OAuth clients): each feature must fail closed when its secret is missing.
- **Large route files**: `routes/collab.ts` (~600 lines, notifications included), `routes/workspaces.ts`. Authorization consistency across many handlers.

## Web (TanStack Start)

- `dangerouslySetInnerHTML` with a home-made `renderSimpleMarkdown` in `routes/blog/$slug.tsx` and `routes/help/$slug.tsx` (trusted repo content today; confirm no user content reaches it).
- Public viewers `/s/$token`, `/e/$token` (embeds, `frame-ancestors` for Notion), `/c/$documentId`: SSR data leakage, caching headers (CDN caching a private share?), OG tags exposing images.
- `redeem.tsx`, `affiliates.tsx`: abuse and enumeration of codes.
- `@tanstack/*-devtools` in dependencies: excluded from production bundles?
- Hosting and security headers for the web app are not in the repo: `UNVERIFIED`.

## Mobile, extensions, plugins

- **Mobile** (Expo 56, scheme `snapglow`, `expo-share-intent`, `expo-media-library`): shared images from other apps (untrusted input), media library permissions, AsyncStorage for anything sensitive, deep links, OTA/EAS update channel.
- **VS Code extension**: API key in `context.secrets` (good). Webviews and their CSP, `@napi-rs/canvas` native binary per platform, `vscode-extension.yml` on Node 22.
- **Figma plugin**: `innerHTML` in `src/ui.ts`; where the API key is stored (`figma.clientStorage`?), network access declared in `manifest.json`.
- **Notion embed** (`apps/notion-embed/src/server.ts`): standalone Node server doing Notion OAuth; where it stores `notionToken`, session handling, CSRF/state, listen address, deployment unknown.

## Infra, CI, supply chain

- **docker-compose** (`apps/api/docker-compose.yml`): Postgres `5432`, Redis `6379` (no password), MinIO `9000`/`9001` with `minioadmin`, published on all interfaces; `minio/minio:latest`. Fine on a laptop only.
- **No Dockerfile or deploy workflow** for the API/web: production hosting, TLS, DB/S3 backups are `UNVERIFIED`.
- **CI**: actions pinned by tag (`@v4`, `@v2`, `tauri-action@v0`), `permissions:` only in `release.yml`, no `pnpm audit` / `cargo audit` / secret scanning / dependency review (the 2026-06 audit recommended a scheduled audit).
- `.tauri/` is gitignored and `.env*` too: confirm nothing sensitive was ever tracked (`git log --all -- .tauri '*.env*' '*.key'`).
- `tools/style-classifier` (Python dataset tooling): out of the runtime path; check it ships nothing into the app except the model, and the model's provenance.
