# ADR-018: Cross-device sync

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 4.9–4.10 (S-005)

## Context

Users with multiple devices need captures and settings synchronized when cloud library is enabled (opt-in Auth0).

## Decision

### Sync model

- **`@snapglow/sync-core`** — cursors, settings merge (LWW per key), DTOs
- **Library pull:** `GET /v1/sync/library?since=` returns items updated after cursor
- **Settings:** `GET/PUT /v1/users/me/settings` with per-key JSON + `updatedAt`
- **Soft delete:** `library_items.deleted_at` + `sync_version` increment

### Clients

- Desktop: extend `syncLibrary.ts` with pull on login + periodic poll; apply settings patches to SQLite
- Mobile: minimal `modules/cloud/` — auth + library list

### Conflict resolution

- Last-write-wins on settings keys (no CRDT in v1)
- Library items identified by cloud `id`; local `localId` preserved on upload

## Consequences

- Migration `0007_user_sync.sql`
- Offline upload queue unchanged; pull is additive

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Full CRDT | Over-engineered for MVP sync |
| Settings-only sync | Phase 4 requires captures too |
