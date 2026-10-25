import { createFileRoute, Link } from '@tanstack/react-router';
import { getBlogPosts } from '#/lib/blog/loadBlogPosts';

export const Route = createFileRoute('/blog/')({
  head: () => ({
    meta: [
      { title: 'Blog — Xcreener' },
      { name: 'description', content: 'Tips, comparisons, and guides for screenshot workflows.' },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const posts = getBlogPosts();

  return (
    <div className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-muted no-underline hover:text-foreground">
          ← Xcreener
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold">Blog</h1>
        <p className="mt-2 text-muted">Guides and comparisons for screenshot workflows.</p>

        <div className="mt-8 space-y-6">
          {posts.map((post) => (
            <article key={post.slug} className="border-b border-border pb-6">
              <time className="text-xs text-muted">{post.publishedAt}</time>
              <h2 className="mt-1 text-xl font-semibold">
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="text-foreground no-underline hover:underline"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{post.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
