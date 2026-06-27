import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const blogDir = join(dirname(fileURLToPath(import.meta.url)), '../src/content/blog');
const required = ['title', 'description', 'publishedAt', 'author'];

async function main() {
  const entries = await readdir(blogDir);
  const mdFiles = entries.filter((name) => name.endsWith('.md'));
  const errors = [];

  for (const file of mdFiles) {
    const raw = await readFile(join(blogDir, file), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
      errors.push(`${file}: missing frontmatter`);
      continue;
    }

    const meta = {};
    for (const line of match[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }

    for (const key of required) {
      if (!meta[key]?.trim()) {
        errors.push(`${file}: missing frontmatter field "${key}"`);
      }
    }

    if (!raw.slice(match[0].length).trim()) {
      errors.push(`${file}: empty body`);
    }
  }

  if (errors.length > 0) {
    console.error('Blog validation failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }

  console.log(`Blog validation OK (${mdFiles.length} posts)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
