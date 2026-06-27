# SnapGlow API (`apps/api`)

Fastify backend for cloud sharing (Sprint 2b.5+) and integrations/library (Sprint 2b.6+).

## Stack

- **Fastify 5** — HTTP API
- **PostgreSQL + Drizzle** — users, shares, library metadata
- **Redis** — upload rate limiting, share metadata cache
- **S3-compatible storage** — MinIO (local), Cloudflare R2 (prod)
- **Auth0 JWT** — Bearer tokens verified via JWKS

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

## Conventions

- Env validated with `@t3-oss/env-core` + Zod (`src/env.ts`)
- Shared types in `@snapglow/cloud-core`, `@snapglow/integrations-core`
- Privacy: uploads only from authenticated clients; explicit consent in desktop UI
- Integration OAuth secrets live in API env only; access tokens stored on desktop
- Link expiry: `1h`, `24h`, `7d`, `permanent` (see `packages/cloud-core`)

## Related

- Public viewer: `apps/web/src/routes/s/$token.tsx`
- Desktop upload: `apps/desktop/src/modules/cloud/`
- Desktop integrations: `apps/desktop/src/modules/integrations/`
- ADR: `docs/internal/technical/adr/009-cloud-api-and-sharing.md`, `010-integrations-and-library.md`
