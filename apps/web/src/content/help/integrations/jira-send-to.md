---
title: Send captures to Jira
category: Integrations
description: Connect Jira Cloud and attach beautified screenshots to issues from SnapGlow desktop.
order: 1
---

Attach SnapGlow exports directly to **Jira Cloud** issues without leaving the editor.

## Requirements

- SnapGlow desktop signed in to cloud
- **Team Pro** workspace (enterprise integration)
- Jira Cloud site with OAuth app configured on the SnapGlow API

## Connect Jira

1. Open **Settings → Integrations**.
2. Click **Connect** next to Jira.
3. Complete Atlassian OAuth in your browser.
4. Return to SnapGlow — the connection shows your site name.

## Send an export

1. Beautify your capture in the editor.
2. In the export bar, choose **Send to → Jira**.
3. Pick an issue and optional comment.
4. SnapGlow uploads the image as an attachment and adds a comment with a link when supported.

## Troubleshooting

- **Connect disabled** — upgrade to Team Pro or ask your workspace admin.
- **No issues listed** — verify you have browse permission on the Jira project.
- **OAuth error** — ensure `ATLASSIAN_CLIENT_ID` / redirect URI match your API deployment.
