# SnapGlow for VS Code

Capture code from your editor, beautify with SnapGlow cloud, and copy the result to your clipboard.

## Setup

1. Sign in to SnapGlow desktop and open **Settings → Team**.
2. Upgrade to **Team Pro** and create an API key under **API keys**.
3. In VS Code, run **SnapGlow: Configure API Key** and paste your `sg_live_...` key.

## Commands

| Command | Description |
|---------|-------------|
| `SnapGlow: Configure API Key` | Store your workspace API key |
| `SnapGlow: Capture Editor` | Render the active editor (or selection) to PNG clipboard |
| `SnapGlow: Capture & Beautify` | Upload → beautify → export via SnapGlow API → clipboard |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `snapglow.baseUrl` | `https://api.snapglow.app` | SnapGlow API base URL |

## Privacy

Captures are sent to your SnapGlow workspace only when you run **Capture & Beautify**. Local capture copies PNG data to your clipboard without network access.

## License

MIT
