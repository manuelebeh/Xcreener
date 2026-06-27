---
title: Notion embeds
category: Plugins
description: Rich embed blocks for captures using /e/:token viewer URLs.
order: 3
---

# Notion embeds

Publish captures as embed-friendly links for Notion pages.

## Publish

From the API or SDK, call **publish** on a capture to get an embed token. The viewer lives at `/e/:token` with Notion-compatible `frame-ancestors`.

## Notion embed tool

Run `apps/notion-embed` locally for OAuth and inserting embed blocks into pages.

## Viewer

Embeds show the beautified capture with Open Graph metadata for link previews. Tokens are opaque capability URLs — treat them like share links.

## Desktop

Upload from SnapGlow desktop, then publish via API key automation or the Notion tool.
