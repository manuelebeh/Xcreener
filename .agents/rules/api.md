# SnapGlow API (`apps/api`)

Fastify backend for cloud sharing (Sprint 2b.5+), integrations/library (Sprint 2b.6+), and team workspaces (Sprint 3.1–3.2+).

## Stack

- **Fastify 5** — HTTP API
- **PostgreSQL + Drizzle** — users, shares, library metadata, workspaces
- **Redis** — upload rate limiting, share metadata cache
- **S3-compatible storage** — MinIO (local), Cloudflare R2 (prod)
- **Auth0 JWT** — Bearer tokens verified via JWKS; optional `org_id` claim for SSO
- **Stripe** — Team seat billing (Checkout + webhooks)

## Dev

```bash
mise run dev:api   # docker compose (Postgres, Redis, MinIO) + Fastify on :8787
cp apps/api/.env.example apps/api/.env.local
pnpm --filter @snapglow/api db:migrate
```

## Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | No | Postgres + Redis status |
| POST | `/v1/shares` | Bearer JWT | Multipart upload + create share |
| GET | `/v1/shares/:token` | No | Public share metadata + presigned asset URL |
| GET | `/v1/integrations/:provider/authorize` | Bearer JWT | OAuth authorize URL + state |
| POST | `/v1/integrations/:provider/token` | Bearer JWT | Exchange OAuth code for tokens |
| POST | `/v1/library` | Bearer JWT | Upload library item (idempotent via `localId`) |
| GET | `/v1/library` | Bearer JWT | Search library (`q`, `tag`, `collection`) |
| GET | `/v1/library/:id` | Bearer JWT | Item metadata + presigned URL |
| PATCH | `/v1/library/:id` | Bearer JWT | Update tags / collections |
| GET | `/v1/collections` | Bearer JWT | List collections |
| POST | `/v1/collections` | Bearer JWT | Create collection |
| PATCH | `/v1/collections/:id` | Bearer JWT | Rename collection |
| DELETE | `/v1/collections/:id` | Bearer JWT | Delete collection |
| POST | `/v1/workspaces` | Bearer JWT | Create workspace (creator = admin) |
| GET | `/v1/workspaces` | Bearer JWT | List user workspaces |
| GET/PATCH | `/v1/workspaces/:id` | viewer/admin | Workspace detail / rename |
| GET | `/v1/workspaces/:id/members` | viewer | List members |
| PATCH | `/v1/workspaces/:id/members/:userId` | admin | Change member role |
| DELETE | `/v1/workspaces/:id/members/:userId` | admin | Remove member |
| POST | `/v1/workspaces/:id/invitations` | admin | Create signed invite link |
| POST | `/v1/invitations/:token/accept` | Bearer JWT | Accept invitation |
| DELETE | `/v1/workspaces/:id/invitations/:id` | admin | Revoke invitation |
| GET/PUT | `/v1/workspaces/:id/brand-kit` | viewer/admin | Read / upsert brand kit |
| POST | `/v1/workspaces/:id/brand-kit/logo` | admin | Multipart logo upload |
| GET | `/v1/workspaces/:id/billing` | admin | Subscription status |
| POST | `/v1/workspaces/:id/billing/checkout` | admin | Stripe Checkout session |
| POST | `/v1/billing/webhook` | Stripe sig | Subscription lifecycle events |
| GET | `/v1/workspaces/:id/sso` | admin | SSO status |
| POST | `/v1/workspaces/:id/sso/enable` | admin | Enable Auth0 Organization (Team Pro) |
| POST | `/v1/collab/documents` | editor + paid plan | Create collab document (multipart screenshot + state JSON) |
| GET | `/v1/collab/documents/:id` | viewer | Document + presigned screenshot + collab URL |
| PATCH | `/v1/collab/documents/:id` | editor | Snapshot `documentState` / title |
| POST | `/v1/collab/documents/:id/link-library` | editor | Associate `library_item_id` |
| GET/POST | `/v1/collab/documents/:id/comments` | viewer | List / create threaded comments |
| PATCH/DELETE | `/v1/collab/documents/:id/comments/:commentId` | author/admin | Update / soft-delete comment |
| GET | `/v1/notifications` | Bearer JWT | List in-app notifications |
| PATCH | `/v1/notifications/:id/read` | Bearer JWT | Mark notification read |
| POST | `/v1/notifications/read-all` | Bearer JWT | Mark all read |
| WS | `/v1/collab/ws` | JWT (auth message) | Real-time annotation ops, presence, comment/notification events |

Optional header `X-Workspace-Id` scopes library/share uploads and collab document creation to a team workspace. Library list with this header returns workspace-scoped items.

## Conventions

- Env validated with `@t3-oss/env-core` + Zod (`src/env.ts`)
- Shared types in `@snapglow/cloud-core`, `@snapglow/integrations-core`, `@snapglow/team-core`, `@snapglow/collab-core`
- Workspace authz via `requireWorkspaceRole` / `can()` from `@snapglow/team-core`
- Privacy: uploads only from authenticated clients; explicit consent in desktop UI
- Integration OAuth secrets live in API env only; access tokens stored on desktop
- Link expiry: `1h`, `24h`, `7d`, `permanent` (see `packages/cloud-core`)

## Related

- Public viewer: `apps/web/src/routes/s/$token.tsx`
- Desktop upload: `apps/desktop/src/modules/cloud/`
- Desktop team: `apps/desktop/src/modules/team/`
- Desktop collab: `apps/desktop/src/modules/collab/`
- Web collab: `apps/web/src/routes/c/$documentId.tsx`
- Desktop integrations: `apps/desktop/src/modules/integrations/`
- ADR: `009-cloud-api-and-sharing.md`, `010-integrations-and-library.md`, `011-workspaces-team-and-billing.md`, `012-realtime-collaboration.md`
