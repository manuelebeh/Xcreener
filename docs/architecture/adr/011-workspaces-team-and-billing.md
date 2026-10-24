# ADR-011: Workspaces, team management, and billing

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 3.1–3.2 (T-001–T-005)

## Context

Sprint 2b delivered Auth0 cloud sharing (ADR-009) and hybrid library (ADR-010). Phase 3 adds **multi-tenant workspaces** for B2B teams: roles, invitations, shared brand kit, Stripe seat billing, and SSO via Auth0 Organizations for Team Pro.

## Decision

### Shared package

- **`@snapglow/team-core`** — workspace roles, plan limits, permission matrix (`can()`), response types, brand kit config

### Tenancy model

- **Workspace** = tenant; creator becomes `admin`
- Existing cloud resources (`shares`, `library_items`, `collections`) gain nullable `workspace_id` FK
- `NULL` workspace_id = personal space (backward compatible)
- Desktop sends optional `X-Workspace-Id` header on library/share uploads when a team workspace is active

### Roles (FR-017)

| Role | Capabilities |
|------|--------------|
| `admin` | Manage workspace, members, invitations, brand kit, billing, SSO |
| `editor` | Create/edit cloud library items in workspace scope |
| `viewer` | Read workspace resources, brand kit |

Permission checks via `can(role, action)` in `team-core`; API enforces with `requireWorkspaceRole` middleware.

### Invitations (v1)

- Signed link: nanoid token, 7-day expiry; transactional email optional (Resend, Sprint 3.3–3.4 — see ADR-012)
- Deep link: `snapglow://team/invite?token=…`
- Accept: `POST /v1/invitations/:token/accept` (authenticated; email match when invitation email set)

### Brand kit

- Extends `WatermarkConfig` from `@snapglow/editor-core`
- Logo in S3: `brand-kits/{workspaceId}/logo`
- Colors/fonts JSONB on `brand_kits` table
- Desktop caches kit locally; export merges team kit over personal watermark when active paid workspace + toggle ON

### Billing (Stripe)

- Plans: `free` (1 member), `team_starter` (max 5), `team_pro` (unlimited seats)
- Stripe Checkout subscription; quantity = active member count
- Webhooks update `workspace_subscriptions` and `workspaces.plan`
- Sandbox keys for dev; Customer Portal for self-service

### SSO (Team Pro)

- **Auth0 Organizations**: one org per Team Pro workspace
- `auth0_org_id` stored on `workspaces`
- Desktop PKCE: `organization={auth0_org_id}` when workspace requires SSO
- JWT claim `org_id` validated in API auth plugin
- SAML/OIDC connections configured in Auth0 dashboard (no custom SAML in API)

#### Auth0 dashboard setup (Team Pro)

1. Enable **Organizations** on Auth0 tenant (Enterprise feature)
2. Create Management API M2M app with scopes: `create:organizations`, `read:organizations`, `update:organizations`
3. Set `AUTH0_MANAGEMENT_CLIENT_ID` + `AUTH0_MANAGEMENT_CLIENT_SECRET` in API env
4. For each Team Pro workspace: admin calls `POST /v1/workspaces/:id/sso/enable` → creates Auth0 org
5. In Auth0 dashboard → Organization → Connections: enable SAML or OIDC enterprise connection
6. Desktop users sign in with `organization` param; JWT includes `org_id`

Fallback: without Management API credentials, admin sets `auth0_org_id` manually after creating org in dashboard.

## Consequences

- New Postgres migration `0002_workspaces.sql`
- API env adds Stripe + optional Auth0 Management credentials
- Desktop Settings gains Team section after Cloud auth
- CI covers `team-core` unit tests and API workspace authz smoke tests

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Email invitations v1 | Zero-infra signed links align with privacy-first; transactional email added Sprint 3.3–3.4 (ADR-012, optional Resend) |
| Custom SAML in API | Auth0 Organizations already chosen in ADR-009 for Phase 3 SSO |
| Web team dashboard | Desktop-first per sprint scope |
