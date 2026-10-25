// Bundles the API for production. Workspace packages ship TypeScript sources, so they are
// inlined; every other dependency stays external and is installed by `pnpm deploy`.
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((name) => !name.startsWith('@xcreener/'));

await build({
  // The render worker is its own entry: piscina loads it by path (render-pool.ts).
  entryPoints: ['src/index.ts', 'src/services/render-worker.ts'],
  outdir: 'dist',
  entryNames: '[name]',
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external,
  logLevel: 'info',
});
