---
title: Send captures to Microsoft Teams
category: Integrations
description: Post beautified screenshots to Teams channels from Xcreener desktop.
order: 3
---

Share exports to **Microsoft Teams** channels for async design reviews and support threads.

## Requirements

- Xcreener desktop + cloud sign-in
- **Team Pro** workspace
- Microsoft Entra app with `ChannelMessage.Send` and `Channel.ReadBasic.All` scopes

## Connect Teams

1. Open **Settings → Integrations**.
2. Click **Connect** next to Microsoft Teams.
3. Sign in with your Microsoft work account and grant channel permissions.

## Send an export

1. Export or beautify your capture.
2. Choose **Send to → Microsoft Teams**.
3. Pick a channel and optional message.
4. Xcreener posts the image to the channel feed.

## Troubleshooting

- **No channels** — the signed-in user must be a member of the team.
- **403 on send** — verify admin consent for the Xcreener Entra application.
