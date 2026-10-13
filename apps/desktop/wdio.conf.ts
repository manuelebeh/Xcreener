import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = path.dirname(fileURLToPath(import.meta.url));

function resolveDebugAppPath() {
  if (process.env.TAURI_APP_PATH) {
    return process.env.TAURI_APP_PATH;
  }

  if (os.platform() === 'darwin') {
    return path.join(desktopDir, 'src-tauri', 'target', 'debug', 'bundle', 'macos', 'SnapGlow.app');
  }

  const ext = os.platform() === 'win32' ? '.exe' : '';
  return path.join(desktopDir, 'src-tauri', 'target', 'debug', `snapglow-desktop${ext}`);
}

function resolveTauriOptions() {
  const options: {
    application: string;
    webviewOptions?: { userDataFolder: string };
  } = {
    application: resolveDebugAppPath(),
  };

  // WebView2 on Windows CI needs a writable user-data folder or msedgedriver
  // fails with "DevToolsActivePort file doesn't exist" during session create.
  if (os.platform() === 'win32') {
    const userDataFolder = path.join(os.tmpdir(), `snapglow-e2e-webview-${process.pid}`);
    mkdirSync(userDataFolder, { recursive: true });
    options.webviewOptions = { userDataFolder };
  }

  return options;
}

export const config = {
  runner: 'local',
  hostname: '127.0.0.1',
  port: 4444,
  path: '/',
  specs: ['./e2e-native/specs/**/*.ts'],
  maxInstances: 1,
  capabilities: [
    {
      browserName: 'wry',
      // WebdriverIO 9 adds `webSocketUrl: true` (BiDi) for any named browser; WebKitWebDriver
      // without BiDi then answers "Failed to match capabilities". tauri-driver speaks classic WebDriver.
      'wdio:enforceWebDriverClassic': true,
      'tauri:options': resolveTauriOptions(),
    },
  ],
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 3,
};

export default config;
