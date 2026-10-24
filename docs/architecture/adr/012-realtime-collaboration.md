# ADR-012: Real-time collaboration (WebSocket, comments, notifications)

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 3.3–3.4 (T-006–T-009)

## Context

Sprint 3.1–3.2 delivered workspaces, roles, and billing (ADR-011). Phase 3 collaboration requires multi-user annotation sync, threaded comments, and in-app/email notifications on team captures.

## Decision

### Shared package

- **`@snapglow/collab-core`** — WebSocket message types, document/comment/notification DTOs, mention parsing, participant colors

### Data model (Postgres `0003_collab.sql`)

| Table | Purpose |
|-------|---------|
| `collab_documents` | Workspace-scoped editable document: S3 screenshot + JSON `document_state` (annotations + beautify) + monotonic `version` |
| `comments` | Threaded comments with optional normalized anchor `{x,y}` and `mention_user_ids` |
| `notifications` | Per-user in-app notifications (`comment`, `mention`, `invitation`) |

Optional `library_item_id` links a document to a workspace library item after save.

### Transport

- **REST** `/v1/collab/documents/*`, `/v1/collab/documents/:id/comments/*`, `/v1/notifications/*`
- **WebSocket** `/v1/collab/ws` — auth via first `{ type: "auth", token, documentId }` message (Auth0 JWT)
- **Redis pub/sub** channel `collab:room:{documentId}` for multi-instance broadcast
- **Redis hash** `collab:presence:{documentId}` with 30s TTL for cursors/selection

### Sync protocol (v1)

- Operation-based annotation sync: `add | update | remove | batch`
- Server applies op to Postgres `document_state`, increments `version`, broadcasts to room
- **LWW per `annotation.id`** on concurrent updates (no CRDT v1)
- Presence throttled client-side at 50 ms

### Permissions (`team-core`)

| Role | collab:read | collab:edit | comments:create |
|------|-------------|-------------|-----------------|
| admin | yes | yes | yes |
| editor | yes | yes | yes |
| viewer | yes | no | yes |

Gated to **paid workspace plans** (`team_starter`, `team_pro`).

### Library workspace reads

`GET /v1/library` with `X-Workspace-Id` returns workspace-scoped items (not only owner `user_id`). Item GET allows workspace members when `workspace_id` is set.

### Clients

- **Desktop** `modules/collab/` — CollabBar, WS client, annotation sync hooks, remote cursors, comments panel, notifications bell
- **Web** `/c/:documentId` — Auth0 PKCE web login, canvas editor subset, same WS protocol

### Email (T-009)

- Optional `RESEND_API_KEY` or `SMTP_URL` stub
- Mention notifications send transactional email when recipient `users.email` exists
- Graceful degrade to in-app-only when email env absent

## Consequences

- New dependency `@fastify/websocket` on API
- Redis used for pub/sub and presence (existing instance)
- Web app adds Auth0 env vars (`VITE_AUTH0_*`) for collab login
- CI covers `collab-core`, collab RBAC, and annotation op unit tests

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| CRDT (Yjs) v1 | Higher complexity; op broadcast + LWW meets &lt;200 ms target for v1 |
| SSE instead of WS | Bidirectional presence + ops need full-duplex |
| Comments-only without live annotations | Does not meet FR-016 acceptance criteria |
