---
title: API keys and SDK
category: API
description: Create Team Pro API keys and use the official JavaScript SDK.
order: 1
---

# API keys and SDK

Public API access requires **Team Pro**.

## Create a key

1. **Settings → Team → API keys**
2. Name the key (e.g. `CI pipeline`)
3. Copy the `sg_live_*` key immediately — it is shown once

## Authentication

```http
Authorization: Bearer sg_live_...
```

## Rate limits

- General: 120 requests/minute per key (configurable server-side)
- Upload: 20/hour
- Export: 30/hour

## SDK

Install `@xcreener/sdk` for TypeScript clients. OpenAPI docs live at `/docs` on the API host.

## Revoke

Revoke compromised keys from Settings. Last-used timestamps help audit activity.
