import { createFileRoute, Link } from '@tanstack/react-router';
import { getBlogPost, renderSimpleMarkdown, type BlogPost } from '#/lib/blog/loadBlogPosts';

export const Route = createFileRoute('/blog/$slug')({
  head: ({ loaderData }) => {
    const post = loaderData as BlogPost | undefined;
    const slug = post?.slug;
    const alternates = slug
      ? ['en', 'fr', 'de', 'ja'].map((lang) => ({
          hrefLang: lang,
          href:
            lang === 'en'
              ? `https://snapglow.app/blog/${slug}`
              : `https://snapglow.app/blog/${slug}?lang=${lang}`,
        }))
      : [];

    return {
      meta: [
        { title: `${post?.title ?? 'Article'} — SnapGlow Blog` },
        { name: 'description', content: post?.description ?? '' },
        ...alternates.map((alt) => ({
          tag: 'link',
          rel: 'alternate',
          hrefLang: alt.hrefLang,
          href: alt.href,
        })),
      ],
    };
  },
  loader: ({ params }): BlogPost => {
    const post = getBlogPost(params.slug);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData() as BlogPost;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
  };

  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <article className="mx-auto max-w-3xl">
        <Link to="/blog" className="text-sm text-muted no-underline hover:text-foreground">
          ← Blog
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {post.publishedAt} · {post.author}
        </p>
        <div
          className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(post.body) }}
        />
      </article>
    </div>
  );
}
