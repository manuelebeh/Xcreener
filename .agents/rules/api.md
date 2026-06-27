# SnapGlow API (`apps/api`)

Fastify backend for cloud sharing (Sprint 2b.5+).

## Stack

- **Fastify 5** — HTTP API
- **PostgreSQL + Drizzle** — users, shares metadata
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

## Conventions

- Env validated with `@t3-oss/env-core` + Zod (`src/env.ts`)
- Shared types in `@snapglow/cloud-core`
- Privacy: uploads only from authenticated clients; explicit consent in desktop UI
- Link expiry: `1h`, `24h`, `7d`, `permanent` (see `packages/cloud-core`)

## Related

- Public viewer: `apps/web/src/routes/s/$token.tsx`
- Desktop upload: `apps/desktop/src/modules/cloud/`
- ADR: `docs/internal/technical/adr/009-cloud-api-and-sharing.md`
