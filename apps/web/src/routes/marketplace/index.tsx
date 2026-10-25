import { createFileRoute, Link } from '@tanstack/react-router';
import { fetchTemplateList } from '#/lib/marketplace/fetchTemplates';

export const Route = createFileRoute('/marketplace/')({
  head: () => ({
    meta: [
      { title: 'Template marketplace — Xcreener' },
      {
        name: 'description',
        content: 'Community beautification templates for Xcreener screenshots.',
      },
    ],
  }),
  loader: async () => fetchTemplateList({ limit: 48 }),
  component: MarketplaceIndexPage,
});

function MarketplaceIndexPage() {
  const { items, total } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="text-lg font-semibold tracking-tight no-underline text-foreground">
          Xcreener
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/help" className="font-medium text-muted no-underline hover:text-foreground">
            Help
          </Link>
          <Link to="/blog" className="font-medium text-muted no-underline hover:text-foreground">
            Blog
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">Template marketplace</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Community beautification presets — install in Xcreener desktop from Settings →
          Marketplace.
        </p>
        <p className="mt-1 text-sm text-muted">{total} templates</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
            >
              {item.previewUrl ? (
                <img
                  src={item.previewUrl}
                  alt=""
                  className="mb-3 aspect-video w-full rounded-md object-cover"
                />
              ) : (
                <div className="mb-3 flex aspect-video items-center justify-center rounded-md bg-muted/20 text-sm text-muted">
                  No preview
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base font-semibold">
                  <Link
                    to="/marketplace/$slug"
                    params={{ slug: item.slug }}
                    className="text-foreground no-underline hover:underline"
                  >
                    {item.title}
                  </Link>
                </h2>
                {item.featured ? (
                  <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Featured
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                {item.downloadCount} installs
                {item.tags.length > 0 ? ` · ${item.tags.join(', ')}` : ''}
              </p>
            </article>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="mt-8 text-muted">No templates yet. Check back soon!</p>
        ) : null}
      </main>
    </div>
  );
}
