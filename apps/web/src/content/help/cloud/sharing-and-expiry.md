---
title: Sharing and expiry
category: Cloud
description: Upload captures and control how long public share links stay active.
order: 1
---

# Sharing and expiry

Cloud sharing is opt-in. Sign in from **Settings → Cloud sharing** in the desktop app before uploading.

## Creating a share link

From the editor export bar, choose **Upload & share**. Pick an expiry:

- 1 hour, 24 hours, 7 days, or permanent

Recipients open `/s/:token` in the browser — no account required.

## Privacy

Uploads use your Auth0 identity. Team workspaces can scope library items with **X-Workspace-Id** when a team workspace is active.

## Expired links

Expired shares return HTTP 410. Re-upload from the desktop app to create a new link.
