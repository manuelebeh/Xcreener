import { createFileRoute } from '@tanstack/react-router';
import { getBlogPosts } from '#/lib/blog/loadBlogPosts';
import { getHelpArticles } from '#/lib/help/loadArticles';

const BASE = 'https://xcreener.app';
const LOCALES = [
  { hreflang: 'en', lang: '' },
  { hreflang: 'fr', lang: 'fr' },
  { hreflang: 'de', lang: 'de' },
  { hreflang: 'ja', lang: 'ja' },
] as const;

function localizedUrls(path: string): Array<{ loc: string; hreflang: string }> {
  return LOCALES.map(({ hreflang, lang }) => ({
    loc: lang ? `${BASE}${path}?lang=${lang}` : `${BASE}${path}`,
    hreflang,
  }));
}

function urlEntry(path: string, lastmod?: string): string {
  const alternates = localizedUrls(path);
  const defaultLoc = alternates[0]?.loc ?? `${BASE}${path}`;
  const altLinks = alternates
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.loc}" />`)
    .join('\n');
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';

  return `  <url>
    <loc>${defaultLoc}</loc>${lastmodTag}
${altLinks}
  </url>`;
}

export const Route = createFileRoute('/sitemap/xml')({
  server: {
    handlers: {
      GET: () => {
        const staticPaths = ['/', '/help', '/marketplace', '/affiliates', '/blog'];
        const helpSlugs = getHelpArticles().map((a) => `/help/${a.slug}`);
        const blogPosts = getBlogPosts();

        const entries = [
          ...staticPaths.map((path) => urlEntry(path)),
          ...helpSlugs.map((slug) => urlEntry(slug)),
          ...blogPosts.map((post) => urlEntry(`/blog/${post.slug}`, post.publishedAt)),
        ];

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;

        return new Response(body, {
          headers: { 'Content-Type': 'application/xml' },
        });
      },
    },
  },
});
