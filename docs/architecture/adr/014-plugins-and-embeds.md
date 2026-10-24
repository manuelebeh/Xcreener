# ADR-014: IDE/Design plugins and Notion embeds

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 3.7–3.8 (T-015–T-018)

## Context

Sprint 3.5–3.6 delivered the public REST API (ADR-013). Sprint 3.7–3.8 adds first-party plugins (VS Code, Figma, Notion) and team usage reports. Plugins must reuse the API key auth model and server-side beautify/export pipeline.

## Decision

### Auth model

- Plugins authenticate with **workspace API keys** (`sg_live_*`), never end-user JWT
- Admins create keys in desktop Settings → Team (Team Pro) or via JWT admin routes
- Keys stored in plugin secret storage (VS Code SecretStorage, Figma clientStorage)

### Capture flow

Plugins capture **locally** (editor render, Figma export) then:

1. `POST /v1/public/captures` — upload PNG
2. `PATCH /v1/public/captures/:id` — apply beautify preset from `@snapglow/plugin-core`
3. `POST /v1/public/captures/:id/export` — server WYSIWYG render
4. Optional: `POST /v1/public/captures/:id/publish` — permanent embed share

No OS-native capture via API (desktop app remains the capture surface for screen/window).

### Shared presets

| Package | Preset | Use case |
|---------|--------|----------|
| `@snapglow/plugin-core` | `buildCodeCaptureState` | VS Code code screenshots |
| `@snapglow/plugin-core` | `buildDesignCaptureState` | Figma frame import |

### Notion embeds

- `POST /v1/public/captures/:id/publish` creates a **permanent** share (`expiresAt = null`)
- Embed viewer at `{WEB_PUBLIC_URL}/e/:token` — minimal chrome, `frame-ancestors` for Notion
- Distinct from desktop Send-to-Notion (OAuth child page + image block)

### Team usage reports

- `GET /v1/workspaces/:id/usage` — admin-only aggregation from `library_items`, `shares`, `api_captures`
- Dashboard in desktop Settings → Team (`UsageReportsSection`)

### Monorepo layout

| App | Path |
|-----|------|
| VS Code extension | `apps/vscode-extension/` |
| Figma plugin | `apps/figma-plugin/` |
| Notion embed integration | `apps/notion-embed/` |

## Consequences

- `@snapglow/sdk` gains `captures.publish()` method
- `shares` table gains optional `title` for embed OG metadata
- `usage:read` permission added to `@snapglow/team-core` (admin only)

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| JWT in plugins | Long-lived user sessions unsuitable for automation |
| Data-URI in Notion blocks | Size limits; embed URL is stable and rich |
| Web team dashboard | ADR-011 desktop-first; API ready for future web admin |
