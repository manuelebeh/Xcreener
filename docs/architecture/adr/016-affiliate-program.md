# ADR-016: Affiliate program (Rewardful + Stripe)

**Status:** Accepted  
**Date:** 2026-06-27  
**Sprint:** 4.3–4.4 (S-002)

## Context

Phase 4 requires a 30% first-sale affiliate program with tracking and payouts. Stripe billing exists for team subscriptions (ADR-011).

## Decision

### Platform

- **[Rewardful](https://www.rewardful.com/)** integrated with existing Stripe account
- Commission: 30% on first sale (per Market Analysis)
- Affiliate dashboard hosted by Rewardful (embed or SSO link)

### Attribution

- Web landing captures `?via=` or `?ref=` → cookie `sg_ref` (90 days)
- Stripe Checkout passes `client_reference_id` = referral token when present
- Rewardful auto-attributes via Stripe integration when `client_reference_id` matches affiliate

### API webhook

- `POST /v1/webhooks/rewardful` — verify HMAC signature, log conversion, optional PostHog server capture

### Desktop

- Deep link `snapglow://ref/:code` stores referral in settings (optional sync to web cookie pattern)

## Consequences

- Env: `REWARDFUL_WEBHOOK_SECRET`, `REWARDFUL_API_KEY`, `REWARDFUL_PORTAL_URL`
- Web route `/affiliates` links to Rewardful portal
- No custom payout ledger in v1

## Alternatives considered

| Option | Rejected because |
|--------|------------------|
| Stripe Connect custom | 2–3 sprints extra for dashboard + payouts |
| FirstPromoter | Comparable; Rewardful chosen for Stripe-native UX |
