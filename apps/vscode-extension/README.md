# Xcreener for VS Code

Capture code from your editor, beautify with Xcreener cloud, and copy the result to your clipboard.

## Setup

1. Sign in to Xcreener desktop and open **Settings → Team**.
2. Upgrade to **Team Pro** and create an API key under **API keys**.
3. In VS Code, run **Xcreener: Configure API Key** and paste your `sg_live_...` key.

## Commands

| Command | Description |
|---------|-------------|
| `Xcreener: Configure API Key` | Store your workspace API key |
| `Xcreener: Capture Editor` | Render the active editor (or selection) to PNG clipboard |
| `Xcreener: Capture & Beautify` | Upload → beautify → export via Xcreener API → clipboard |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `xcreener.baseUrl` | `https://api.xcreener.app` | Xcreener API base URL |

## Privacy

Captures are sent to your Xcreener workspace only when you run **Capture & Beautify**. Local capture copies PNG data to your clipboard without network access.

## License

MIT
