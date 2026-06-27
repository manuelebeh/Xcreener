# ADR-009: Cloud API and sharing

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 2b.5 (CL-001–CL-006)

## Context

SnapGlow is privacy-first and local-first. Phase 2b adds **optional cloud sharing** (FR-012): authenticated upload, short public links, configurable expiry, and a web viewer. Phase 3 will extend the same backend for multi-tenant workspaces and a public REST API.

## Decision

### Backend (`apps/api`)

- **Fastify** + **PostgreSQL** (Drizzle ORM) + **Redis** + **S3-compatible object storage**
- **Local dev:** Docker Compose (Postgres 16, Redis 7, MinIO)
- **Production storage:** Cloudflare R2 (same S3 SDK, SSE at rest)
- **Auth:** Auth0 OAuth2 / JWT (Google, Apple, GitHub configured in Auth0 dashboard)
- **Infra as code:** deferred (manual / PaaS first per sprint plan)

### Share model

- Short token (nanoid, 12 chars) → public URL `{WEB_PUBLIC_URL}/s/{token}`
- Metadata in Postgres; bytes in object storage
- Public GET returns presigned URL (15 min TTL), not a public bucket
- Expiry: `1h`, `24h`, `7d`, `permanent` (`expires_at` NULL)
- Expired shares return **410 Gone** on fetch

### Clients

- **Desktop (MVP):** PKCE Auth0 flow via system browser + `snapglow://auth/callback` deep link; explicit consent dialog before upload; Share link in ExportBar
- **Web:** TanStack Start SSR viewer at `/s/:token` (no auth)
- **Mobile:** API-ready; UI deferred

### Shared package

- `@snapglow/cloud-core` — expiry helpers, MIME allowlist, response types

## Consequences

- Cloud is **opt-in** and **additive**; core capture/editor remain on-device
- CSP / connect-src updated on desktop for Auth0 + API
- CI runs api lint/typecheck/test without Docker (mocked storage)
- Future: R2 lifecycle cleanup cron, client-side encryption, mobile share, CL-012 cloud library

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Clerk | Team chose Auth0 for Phase 3 SSO path |
| Public bucket | Violates least-privilege; presigned URLs preferred |
| Terraform GCP (fullstack-starter) | Explicitly deferred in sprint plan |
