# SnapGlow API (`@snapglow/api`)

Fastify backend for optional cloud sharing (Sprint 2b.5).

## Stack

- Fastify 5, Drizzle ORM, PostgreSQL, Redis
- S3-compatible storage: MinIO (local dev), Cloudflare R2 (production)
- Auth0 JWT verification (JWKS)

## Quick start

```bash
cp .env.example .env.local   # configure Auth0, S3/MinIO
mise run dev:api             # docker compose + Fastify on :8787
pnpm db:migrate              # first run only
```

Health check: `GET http://localhost:8787/health`

## Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Postgres + Redis status |
| POST | `/v1/shares` | Bearer JWT | Multipart upload → share link |
| GET | `/v1/shares/:token` | No | Public metadata + presigned asset URL |

Shared types: `@snapglow/cloud-core`.

## Docs

- [`.agents/rules/api.md`](../../.agents/rules/api.md)
- [ADR-009](../../docs/internal/technical/adr/009-cloud-api-and-sharing.md)
