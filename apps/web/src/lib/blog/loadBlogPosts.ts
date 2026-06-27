export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
}

export interface BlogPost extends BlogPostMeta {
  body: string;
}

const rawModules = import.meta.glob('../content/blog/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const meta: Record<string, string> = {};
  for (const line of match[1]!.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }

  return { meta, body: match[2]!.trim() };
}

function pathToSlug(path: string): string {
  return path.replace('../content/blog/', '').replace(/\.md$/, '');
}

function loadAllPosts(): BlogPost[] {
  return Object.entries(rawModules).map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug: pathToSlug(path),
      title: meta.title ?? 'Untitled',
      description: meta.description ?? '',
      publishedAt: meta.publishedAt ?? '2026-01-01',
      author: meta.author ?? 'SnapGlow Team',
      body,
    };
  });
}

let cached: BlogPost[] | null = null;

export function getBlogPosts(): BlogPost[] {
  if (!cached) {
    cached = loadAllPosts().sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
  return cached;
}

export function getBlogPost(slug: string): BlogPost | undefined {
  return getBlogPosts().find((post) => post.slug === slug);
}

export { renderSimpleMarkdown } from '#/lib/help/loadArticles';
