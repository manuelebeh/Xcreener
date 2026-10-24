# ADR-010: Integrations and hybrid library

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 2b.6 (CL-007–CL-013)

## Context

Sprint 2b.5 delivered Auth0 cloud sharing. Sprint 2b.6 adds third-party send targets (Slack, Notion, Linear, GitHub), a searchable local/cloud library, tags/collections, and export watermarks — while keeping SnapGlow privacy-first and local-first.

## Decision

### Integrations framework

- **`@snapglow/integrations-core`** — provider ids, scopes, shared send types
- **API OAuth proxy** — `GET/POST /v1/integrations/:provider/*` exchanges codes using server secrets; desktop stores tokens in SQLite (`integrationTokens`)
- **Desktop `modules/integrations/`** — Settings connect/disconnect, ExportBar **Send to…** with consent dialog, direct provider API calls with local tokens
- Deep link: `snapglow://integrations/callback`

### Hybrid library (CL-012)

- **Local:** SQLite `ocr_text` + FTS5 (`captures_fts`), async OCR after `persistCapture`
- **Cloud (opt-in):** Postgres `library_items` + `collections`, Postgres `to_tsvector` search. Background upload in `syncLibrary.ts` runs only when the user turns on "Back up new captures" in settings (`cloudLibrarySync`, default off); signing in alone uploads nothing. Background uploads always go to the personal library, never to the active workspace (2026-10-24 audit, FINDING-001).
- **UI:** History renamed **Library** — OCR search, tag/collection filters, cloud results when signed in

### Tags & collections (CL-013)

- Local tables `collections`, `capture_collections`; JSON `tags` column on `captures`
- Cloud PATCH sync for tags/collections on library items

### Watermark (CL-011)

- `WatermarkConfig` in `@snapglow/editor-core`, rendered last in `renderFrame` via `drawWatermark.ts`
- Settings persistence in SQLite; included in export, share upload, and integration sends
- Billing gating stubbed (`watermarkEnabled` toggle only)

## Consequences

- Desktop CSP/connect-src extended for Slack, Notion, Linear, GitHub APIs
- API env adds optional OAuth client credentials per provider
- CI covers `integrations-core`, API library/integration smoke tests, FTS migration helper test
- Mobile library UI deferred; API ready

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Desktop OAuth secrets | Violates secret storage guidance; API proxy preferred |
| Cloud-only library | Breaks offline/history UX; hybrid matches product spec |
| LIKE-only search | FTS5 gives better OCR recall with Tauri SQL fallback |
