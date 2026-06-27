# ADR-013: Public REST API (API keys, server render, SDK)

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 3.5–3.6 (T-010–T-014)

## Context

Sprint 3.1–3.4 delivered workspaces, billing, and real-time collaboration (ADR-011, ADR-012). Phase 3 requires a **developer-facing REST API** (FR-018) so teams can automate upload, beautification, and export — enabling VS Code / Figma / Notion plugins (Sprint 3.7–3.8).

The internal `/v1/*` API uses Auth0 JWT for desktop/web clients. Third-party automation needs **API keys**, OpenAPI documentation, and **server-side WYSIWYG export** (today beautify/export runs only in desktop Canvas 2D).

## Decision

### Shared packages

| Package | Role |
|---------|------|
| `@snapglow/api-core` | Public API DTOs, Zod schemas, API key format, rate-limit constants |
| `@snapglow/render-core` | Canvas render engine (extracted from desktop) — browser + Node |
| `@snapglow/sdk` | Publishable HTTP client (`@snapglow/sdk`, npm beta) |

Beautify config reuses `CollabDocumentState` from `@snapglow/collab-core`.

### Namespace and auth

- **Public routes:** `/v1/public/captures/*` — `Authorization: Bearer sg_live_<secret>`
- **Key management:** `/v1/workspaces/:id/api-keys/*` — Auth0 JWT + workspace **admin** role
- **Gating:** API keys only for **`team_pro`** workspaces (per pricing)
- Keys are workspace-scoped; stored **hashed** (scrypt); plaintext shown once on create

### Data model (`0004_public_api.sql`)

| Table | Purpose |
|-------|---------|
| `api_keys` | Workspace API keys (prefix, hash, revoke) |
| `api_captures` | API-uploaded screenshots + `document_state` JSON + optional export artifact |

Separate from `library_items` to avoid polluting desktop cloud sync and to simplify API metering.

### Server render

- `@napi-rs/canvas` in `apps/api` for headless export
- `@snapglow/render-core` shared with desktop for WYSIWYG parity
- Export formats: PNG, JPG, WebP; brand kit watermark merged when workspace has brand kit

### Rate limiting (Redis)

| Scope | Default limit | Window |
|-------|---------------|--------|
| `api:general` | 120 | 1 min |
| `api:upload` | 20 | 1 h |
| `api:export` | 30 | 1 h |

Per API key id; `429` + `Retry-After`.

### Documentation

- OpenAPI 3.1 spec: `apps/api/openapi/public.yaml`
- Swagger UI at `/docs`; spec at `/openapi.json`

## Consequences

- Desktop render engine moves to `@snapglow/render-core`; desktop imports shared package
- CI tests mock render service when native canvas unavailable
- API key UI in desktop Settings deferred; admin creates keys via JWT routes
- Capture automation = **upload screenshot + beautify + export**, not OS-native capture

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Reuse JWT routes for public API | M2M unsuitable for long-lived automation; API keys standard for developer API |
| Reuse `library_items` for API captures | Conflates desktop sync with API metering |
| Client-only export via API | Does not meet FR-018 server automation; plugins need rendered bytes |
| MVP export without annotations | User chose full WYSIWYG server render |
