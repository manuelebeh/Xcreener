export interface HelpArticleMeta {
  slug: string;
  title: string;
  category: string;
  description: string;
  order: number;
}

export interface HelpArticle extends HelpArticleMeta {
  body: string;
}

const rawModules = import.meta.glob('../content/help/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { meta: {}, body: raw };
  }

  const frontmatter = match[1];
  const bodyContent = match[2];
  if (frontmatter === undefined || bodyContent === undefined) {
    return { meta: {}, body: raw };
  }

  const meta: Record<string, string> = {};
  for (const line of frontmatter.split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }

  return { meta, body: bodyContent.trim() };
}

function pathToSlug(path: string): string {
  const normalized = path.replace('../content/help/', '').replace(/\.md$/, '');
  return normalized.replace(/\//g, '-');
}

function loadAllArticles(): HelpArticle[] {
  return Object.entries(rawModules).map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug: pathToSlug(path),
      title: meta.title ?? 'Untitled',
      category: meta.category ?? 'General',
      description: meta.description ?? '',
      order: Number.parseInt(meta.order ?? '0', 10) || 0,
      body,
    };
  });
}

let cached: HelpArticle[] | null = null;

export function getHelpArticles(): HelpArticle[] {
  if (!cached) {
    cached = loadAllArticles().sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.order - b.order;
    });
  }
  return cached;
}

export function getHelpArticle(slug: string): HelpArticle | undefined {
  return getHelpArticles().find((article) => article.slug === slug);
}

export function getHelpCategories(): string[] {
  return [...new Set(getHelpArticles().map((article) => article.category))].sort();
}

export function renderSimpleMarkdown(markdown: string): string {
  const escaped = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return escaped
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface px-1 py-0.5 text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, (block) => `<ul class="my-3 space-y-1">${block}</ul>`)
    .replace(/^(?!<[hul])(.+)$/gm, '<p class="my-3 text-muted leading-relaxed">$1</p>');
}
