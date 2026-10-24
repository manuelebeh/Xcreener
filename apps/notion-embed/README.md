# SnapGlow Notion Embed

Insert enriched SnapGlow embed blocks into Notion pages using the public API and Notion OAuth.

## Setup

1. Configure Notion OAuth app (same credentials as SnapGlow API `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`).
2. Set redirect URI to `http://localhost:3456/oauth/callback` in Notion integration settings.
3. Create a Team Pro API key in SnapGlow desktop.

## Run locally

```bash
export NOTION_CLIENT_ID=...
export NOTION_CLIENT_SECRET=...
export WEB_PUBLIC_URL=http://localhost:3000
export SNAPGLOW_API_URL=http://localhost:8787   # the only API the server talks to
pnpm --filter @snapglow/notion-embed dev
```

Open http://localhost:3456

The server binds to `127.0.0.1` (`NOTION_EMBED_HOST` to change it). It has no authentication of its own: do not expose it on a public interface. The Notion session is an `HttpOnly` cookie that expires after one hour.

## Flow

1. **Connect Notion** — OAuth authorization
2. **Load captures** — lists recent API captures for your workspace
3. Select a capture and Notion page → **Insert embed** — publishes permanent embed URL (`/e/:token`) and adds Notion embed block

## Embed viewer

Published captures render at `{WEB_PUBLIC_URL}/e/{token}` with OG metadata for Notion unfurl.
