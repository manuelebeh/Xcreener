import type { TemplateListingResponse } from '@snapglow/marketplace-core';
import { createFileRoute, Link } from '@tanstack/react-router';
import { fetchTemplateBySlug } from '#/lib/marketplace/fetchTemplates';

export const Route = createFileRoute('/marketplace/$slug')({
  head: ({ loaderData }) => {
    const template = loaderData as TemplateListingResponse | undefined;
    return {
      meta: [
        { title: `${template?.title ?? 'Template'} — SnapGlow Marketplace` },
        {
          name: 'description',
          content: template?.description ?? 'Community beautification template for SnapGlow.',
        },
        ...(template?.previewUrl ? [{ property: 'og:image', content: template.previewUrl }] : []),
      ],
    };
  },
  loader: async ({ params }): Promise<TemplateListingResponse> => fetchTemplateBySlug(params.slug),
  component: MarketplaceDetailPage,
});

function MarketplaceDetailPage() {
  const template = Route.useLoaderData() as TemplateListingResponse;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link
          to="/marketplace"
          className="text-sm font-medium text-muted no-underline hover:text-foreground"
        >
          ← Marketplace
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="font-display text-3xl font-bold tracking-tight">{template.title}</h1>
        {template.description ? <p className="mt-2 text-muted">{template.description}</p> : null}

        {template.previewUrl ? (
          <img
            src={template.previewUrl}
            alt=""
            className="mt-6 w-full rounded-lg border border-border"
          />
        ) : null}

        <dl className="mt-6 grid gap-3 text-sm">
          <div>
            <dt className="font-medium text-muted">Padding</dt>
            <dd>{template.style.padding}px</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Border radius</dt>
            <dd>{template.style.borderRadius}px</dd>
          </div>
          <div>
            <dt className="font-medium text-muted">Background</dt>
            <dd>{template.style.background.type}</dd>
          </div>
          {template.tags.length > 0 ? (
            <div>
              <dt className="font-medium text-muted">Tags</dt>
              <dd>{template.tags.join(', ')}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-medium text-muted">Installs</dt>
            <dd>{template.downloadCount}</dd>
          </div>
        </dl>

        <p className="mt-8 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Open SnapGlow desktop → Settings → Marketplace → search &quot;{template.title}&quot; →
          Install.
        </p>
      </main>
    </div>
  );
}
