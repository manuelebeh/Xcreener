# ADR-015: Community template marketplace

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 4.1–4.2 (S-001)

## Context

Phase 4 requires a community marketplace for beautification templates. Users should discover, install, and submit style presets (background, padding, radius, shadow, frame) without sharing screenshots or annotations.

## Decision

### Shared types

- **`@snapglow/marketplace-core`** — `TemplateStyle` (subset of `CollabDocumentState`), Zod validation, DTOs
- Install flow converts `TemplateStyle` → desktop SQLite `custom_presets`

### API

- Postgres `template_listings` table (single table; status field for moderation)
- Public read: `GET /v1/templates`, `GET /v1/templates/:slug`
- Auth submit: `POST /v1/templates`
- Admin moderate: `PATCH /v1/templates/:id/moderate` (workspace admin on SnapGlow internal workspace or env `MARKETPLACE_MODERATOR_SUBS`)

### Web & desktop

- Web browse at `/marketplace`, detail at `/marketplace/:slug`
- Desktop `MarketplaceSection` in Settings — browse + Install → local preset

### Moderation MVP

- Submissions default to `pending`; only `approved` listed publicly
- Moderators identified by Auth0 sub allowlist in env

## Consequences

- Migration `0006_template_marketplace.sql`
- OpenAPI extended with template routes
- Preview images optional (URL supplied by submitter or future server render)

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Separate submissions + listings tables | Over-engineered for MVP |
| Paid templates | Deferred; all community templates free in v1 |
