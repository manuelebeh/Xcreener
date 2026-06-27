# SnapGlow Figma Plugin

Import Figma frames to SnapGlow for beautification, and export SnapGlow captures back to your canvas.

## Setup

1. Create a Team Pro API key in SnapGlow desktop (**Settings → Team → API keys**).
2. Build the plugin: `pnpm --filter @snapglow/figma-plugin build`.
3. In Figma: **Plugins → Development → Import plugin from manifest…** → select `apps/figma-plugin/manifest.json`.

## Usage

- **Import selection → SnapGlow**: exports the selected node as PNG, uploads and beautifies via the API, shows preview.
- **Refresh captures**: lists recent API captures; click one to place it on the canvas.

## Publish to Figma Community

1. Run `pnpm --filter @snapglow/figma-plugin build`.
2. In Figma desktop: **Plugins → Development → Publish** (requires Figma account review).
