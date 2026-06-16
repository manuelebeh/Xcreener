import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const desktopDir = path.dirname(fileURLToPath(new URL('..', import.meta.url)));

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: desktopDir,
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

const driver = spawn('tauri-driver', [], {
  cwd: desktopDir,
  stdio: 'ignore',
  shell: process.platform === 'win32',
  detached: process.platform !== 'win32',
});

try {
  await sleep(2000);
  await run('pnpm', ['exec', 'wdio', 'run', 'wdio.conf.ts']);
} finally {
  if (process.platform === 'win32') {
    driver.kill();
  } else {
    process.kill(-driver.pid);
  }
}
