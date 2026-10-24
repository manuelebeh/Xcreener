---
paths:
  - "apps/api/**/*.{ts,tsx,js}"
---

# SnapGlow API (`apps/api`)

Fastify backend for cloud sharing (Sprint 2b.5+), integrations/library (Sprint 2b.6+), team workspaces (Sprint 3.1–3.2+), and public developer API (Sprint 3.5–3.6+).

## Stack

- **Fastify 5** — HTTP API
- **PostgreSQL + Drizzle** — users, shares, library metadata, workspaces
- **Redis** — upload rate limiting, share metadata cache
- **S3-compatible storage** — MinIO (local), Cloudflare R2 (prod)
- **Auth0 JWT** — Bearer tokens verified via JWKS; optional `org_id` claim for SSO
- **API keys** — `sg_live_*` Bearer tokens for `/v1/public/*` (Team Pro workspaces)
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
| GET | `/v1/library/:id/content` | Bearer JWT | Item bytes through the API (desktop sync pull) |
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
| GET | `/openapi.json` | No | OpenAPI 3.1 spec (public API) |
| GET | `/docs` | No | Swagger UI |
| POST | `/v1/public/captures` | API key | Upload screenshot capture |
| GET | `/v1/public/captures` | API key | List captures (`cursor`, `limit`, `q`, `tag`) |
| GET | `/v1/public/captures/:id` | API key | Capture metadata + presigned screenshot URL |
| PATCH | `/v1/public/captures/:id` | API key | Apply beautify `documentState` |
| POST | `/v1/public/captures/:id/export` | API key | Server render export (PNG/JPG/WebP) |
| GET | `/v1/public/captures/:id/export/content` | API key | Last export bytes through the API (Figma plugin) |
| POST | `/v1/public/captures/:id/publish` | API key | Permanent embed share (`/e/:token`) |
| DELETE | `/v1/public/captures/:id` | API key | Delete capture + blobs |
| GET | `/v1/embeds/:token` | No | Embed metadata + presigned asset (framing headers live on the web `/e/:token` page) |
| GET | `/v1/workspaces/:id/usage` | admin JWT | Team usage reports (`period=7d\|30d\|90d`) |
| GET/POST | `/v1/workspaces/:id/api-keys` | admin JWT | List / create API keys (Team Pro) |
| DELETE | `/v1/workspaces/:id/api-keys/:keyId` | admin JWT | Revoke API key |
| DELETE | `/v1/shares/:token` | Bearer JWT | Revoke a share you created |
| GET | `/v1/sync/library` | Bearer JWT | Library sync pull |
| DELETE | `/v1/library/:id` | Bearer JWT | Delete a library item (sync) |
| GET/PUT | `/v1/users/me/settings` | Bearer JWT | Cross-device settings sync |
| DELETE | `/v1/users/me` | Bearer JWT | Erase the account: cloud data, solo workspaces (Stripe cancelled), Auth0 identity when M2M secrets are set; 409 while sole admin of a team |
| GET | `/v1/me/entitlement` | Bearer JWT | `{ token, plan, userId }`: Ed25519-signed plan token (7 days, `sub` = userId) that desktop and mobile verify offline; viewer-only memberships give `free` |
| GET | `/v1/templates`, `/v1/templates/:slug` | No | Template marketplace listing and detail |
| POST | `/v1/templates` | Bearer JWT | Submit a template |
| POST | `/v1/webhooks/rewardful` | Rewardful sig | Affiliate events (fails closed without a secret) |

Optional header `X-Workspace-Id` scopes library/share uploads and collab document creation to a team workspace. Library list with this header returns workspace-scoped items.

## Conventions

- Env validated with `@t3-oss/env-core` + Zod (`src/env.ts`)
- Shared types in `@snapglow/cloud-core`, `@snapglow/integrations-core`, `@snapglow/team-core`, `@snapglow/collab-core`, `@snapglow/api-core`
- Server render via `@snapglow/render-core` + `@napi-rs/canvas` for public API export
- Export renders run in a piscina worker pool (`services/render-pool.ts`, `RENDER_WORKERS`, `RENDER_TIMEOUT_MS`; busy or timed out → 503); upload size checks read the image header (`services/image-dimensions.ts`), never decode
- Workspace authz via `requireWorkspaceRole` / `can()` from `@snapglow/team-core`
- Privacy: uploads only from authenticated clients; explicit consent in desktop UI
- Integration OAuth secrets live in API env only; access tokens stored on desktop
- Paid features: Jira / Confluence / Teams OAuth require Team Pro (checked in `/v1/integrations/*`); desktop plan comes only from `/v1/me/entitlement`, signed with `ENTITLEMENT_PRIVATE_KEY` and verified in Rust with `SNAPGLOW_ENTITLEMENT_PUBLIC_KEY`
- Link expiry: `1h`, `24h`, `7d`, `permanent` (see `packages/cloud-core`)

## Related

- Public viewer: `apps/web/src/routes/s/$token.tsx`
- Embed viewer: `apps/web/src/routes/e/$token.tsx`
- Desktop upload: `apps/desktop/src/modules/cloud/`
- Desktop team: `apps/desktop/src/modules/team/` (API keys, usage reports)
- Desktop collab: `apps/desktop/src/modules/collab/`
- Web collab: `apps/web/src/routes/c/$documentId.tsx`
- Desktop integrations: `apps/desktop/src/modules/integrations/`
- VS Code plugin: `apps/vscode-extension/`
- Figma plugin: `apps/figma-plugin/`
- Notion embed tool: `apps/notion-embed/`
- ADR: `009-cloud-api-and-sharing.md`, `010-integrations-and-library.md`, `011-workspaces-team-and-billing.md`, `012-realtime-collaboration.md`, `013-public-api.md`, `014-plugins-and-embeds.md`, `015-template-marketplace.md`, `016-affiliate-program.md`, `018-cross-device-sync.md`
- SDK: `packages/sdk` (`@snapglow/sdk`)
- Plugin presets: `packages/plugin-core` (`@snapglow/plugin-core`)
