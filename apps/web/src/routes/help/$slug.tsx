import { createFileRoute, notFound } from '@tanstack/react-router';
import { HelpLayout } from '#/lib/help/HelpLayout';
import { getHelpArticle, renderSimpleMarkdown } from '#/lib/help/loadArticles';

export const Route = createFileRoute('/help/$slug')({
  loader: ({ params }) => {
    const article = getHelpArticle(params.slug);
    if (!article) {
      throw notFound();
    }
    return article;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? 'Help'} — SnapGlow` },
      { name: 'description', content: loaderData?.description ?? '' },
    ],
  }),
  component: HelpArticlePage,
});

function HelpArticlePage() {
  const article = Route.useLoaderData();

  return (
    <HelpLayout activeSlug={article.slug}>
      <p className="text-xs font-medium uppercase text-primary">{article.category}</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{article.title}</h1>
      {article.description ? <p className="mt-2 text-muted">{article.description}</p> : null}
      <div
        className="prose-help mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(article.body) }}
      />
    </HelpLayout>
  );
}
