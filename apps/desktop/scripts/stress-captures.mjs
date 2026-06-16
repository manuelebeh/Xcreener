#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
execSync('pnpm vitest run src/modules/history/utils/stressCaptures.test.ts', {
  cwd: desktopRoot,
  stdio: 'inherit',
});
