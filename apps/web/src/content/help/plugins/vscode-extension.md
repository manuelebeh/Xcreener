---
title: VS Code extension
category: Plugins
description: Capture and beautify code from the editor with the Xcreener SDK.
order: 1
---

# VS Code extension

The **Xcreener** extension (`xcreener-vscode`) beautifies editor captures using your Team Pro API key.

## Setup

1. Create an API key in desktop **Settings → Team**
2. Install the extension from the VS Code Marketplace (or VSIX)
3. Run **Xcreener: Configure API key** and paste your key

## Commands

- Capture the active editor selection or visible range
- Apply beautify presets (padding, background, radius)
- Export PNG or copy to clipboard

## API

The extension calls `/v1/public/captures` via `@xcreener/sdk`.
