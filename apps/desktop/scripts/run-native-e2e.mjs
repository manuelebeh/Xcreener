import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const desktopDir = fileURLToPath(new URL('..', import.meta.url));
const tauriDir = path.join(desktopDir, 'src-tauri');
const wdioBin = path.join(desktopDir, 'node_modules', '.bin', 'wdio');
const configPath = path.join(desktopDir, 'wdio.conf.ts');
const driverPort = 4444;

function run(command, args, options = {}) {
  const { cwd = desktopDir } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function runRustTests() {
  await run('cargo', ['test', '--locked'], { cwd: tauriDir });
}

async function runMacOsFallback() {
  console.log(
    'Native WebDriver is not supported on macOS (Tauri uses WKWebView without a driver).'
  );
  console.log('Docs: https://v2.tauri.app/develop/tests/webdriver/');
  console.log('Running Rust shortcut/tray IPC tests instead...\n');
  await runRustTests();
  console.log('\nFor full UI automation, use CI (Linux/Windows) or the manual tray QA checklist in e2e-native/README.md.');
}

async function waitForDriver(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${driverPort}/status`);
      if (response.ok) {
        return;
      }
    } catch {
      // driver still starting
    }
    await sleep(500);
  }

  throw new Error(
    `tauri-driver did not start on port ${driverPort}. Install with: cargo install tauri-driver --locked`
  );
}

function resolveNativeDriverArgs() {
  if (process.platform !== 'win32') {
    return [];
  }

  const candidates = [
    process.env.TAURI_NATIVE_DRIVER,
    path.join(process.cwd(), 'msedgedriver.exe'),
    path.join(desktopDir, 'msedgedriver.exe'),
    path.join(desktopDir, '..', '..', 'msedgedriver.exe'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return ['--native-driver', candidate];
    }
  }

  return [];
}

/** On failure, replay the session request by hand so the driver's own error message reaches the log. */
async function probeSessionCreation() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const application = process.env.TAURI_APP_PATH ?? path.join(tauriDir, 'target', 'debug', `snapglow-desktop${ext}`);

  try {
    const response = await fetch(`http://127.0.0.1:${driverPort}/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        capabilities: { alwaysMatch: { browserName: 'wry', 'tauri:options': { application } } },
      }),
    });
    console.error(`[probe] POST /session -> ${response.status}: ${(await response.text()).slice(0, 2000)}`);
  } catch (probeError) {
    console.error(`[probe] POST /session failed: ${probeError}`);
  }
}

/** Launch the debug app alone for a few seconds and print what it says, so a startup crash is visible. */
async function smokeLaunchApp() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const application =
    process.env.TAURI_APP_PATH ?? path.join(tauriDir, 'target', 'debug', `snapglow-desktop${ext}`);
  const [command, args] =
    process.platform === 'linux' ? ['xvfb-run', ['-a', application]] : [application, []];

  const child = spawn(command, args, {
    cwd: desktopDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    env: { ...process.env, TAURI_WEBVIEW_AUTOMATION: 'true', RUST_BACKTRACE: '1' },
  });

  let output = '';
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
  });

  const exit = await Promise.race([
    new Promise((resolve) => {
      child.on('exit', (code, signal) => resolve(`exited (code ${code}, signal ${signal})`));
      child.on('error', (error) => resolve(`failed to start: ${error.message}`));
    }),
    sleep(15_000).then(() => null),
  ]);

  console.log(`[smoke] app ${exit ?? 'still running after 15s'}`);
  if (output.trim()) {
    console.log(`[smoke] output:\n${output.trim().slice(-4000)}`);
  }

  if (!exit) {
    try {
      if (process.platform === 'win32') {
        child.kill();
      } else {
        process.kill(-child.pid);
      }
    } catch {
      // already stopped
    }
  }
}

async function runWebDriverSuite() {
  const nativeDriverArgs = resolveNativeDriverArgs();
  if (process.platform === 'win32' && nativeDriverArgs.length === 0) {
    console.warn(
      'msedgedriver.exe not found via TAURI_NATIVE_DRIVER or common paths; relying on PATH'
    );
  }

  const driver = spawn('tauri-driver', nativeDriverArgs, {
    cwd: desktopDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      TAURI_WEBVIEW_AUTOMATION: 'true',
    },
  });

  let driverOutput = '';

  driver.stdout?.on('data', (chunk) => {
    driverOutput += chunk.toString();
  });
  driver.stderr?.on('data', (chunk) => {
    driverOutput += chunk.toString();
  });

  try {
    await waitForDriver();
    const wdioArgs = ['run', configPath];
    if (process.platform === 'linux') {
      await run('xvfb-run', ['-a', wdioBin, ...wdioArgs]);
      return;
    }
    await run(wdioBin, wdioArgs);
  } catch (error) {
    if (driverOutput.trim()) {
      console.error(driverOutput.trim());
    }
    await probeSessionCreation();
    throw error;
  } finally {
    try {
      if (process.platform === 'win32') {
        driver.kill();
      } else {
        process.kill(-driver.pid);
      }
    } catch {
      // driver already stopped
    }
  }
}

if (os.platform() === 'darwin') {
  await runMacOsFallback();
} else {
  await runRustTests();
  await smokeLaunchApp();
  await runWebDriverSuite();
}
