import { createFileRoute, Link } from '@tanstack/react-router';
import { HelpLayout } from '#/lib/help/HelpLayout';
import { getHelpArticles } from '#/lib/help/loadArticles';

export const Route = createFileRoute('/help/')({
  head: () => ({
    meta: [
      { title: 'Help center — SnapGlow' },
      { name: 'description', content: 'Guides for capture, cloud sharing, teams, and plugins.' },
    ],
  }),
  component: HelpIndexPage,
});

function HelpIndexPage() {
  const articles = getHelpArticles();

  return (
    <HelpLayout>
      <h1 className="font-display text-3xl font-bold tracking-tight">Help center</h1>
      <p className="mt-2 text-muted">
        Privacy-first guides for SnapGlow desktop, cloud sharing, and team features.
      </p>

      <div className="mt-8 space-y-6">
        {articles.map((article) => (
          <article key={article.slug} className="rounded-lg border border-border p-4">
            <p className="m-0 text-xs font-medium uppercase text-primary">{article.category}</p>
            <h2 className="mt-1 text-lg font-semibold">
              <Link
                to="/help/$slug"
                params={{ slug: article.slug }}
                className="text-foreground no-underline hover:underline"
              >
                {article.title}
              </Link>
            </h2>
            {article.description ? (
              <p className="mt-2 text-sm text-muted">{article.description}</p>
            ) : null}
          </article>
        ))}
      </div>
    </HelpLayout>
  );
}
