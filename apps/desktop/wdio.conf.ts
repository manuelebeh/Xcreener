import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ext = os.platform() === 'win32' ? '.exe' : '';
const defaultAppPath = path.join(
  desktopDir,
  'src-tauri',
  'target',
  'debug',
  `snapglow-desktop${ext}`
);

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
      'tauri:options': {
        application: process.env.TAURI_APP_PATH ?? defaultAppPath,
      },
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
