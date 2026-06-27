import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { getHelpArticles, getHelpCategories } from '#/lib/help/loadArticles';

interface HelpLayoutProps {
  children: ReactNode;
  activeSlug?: string;
}

export function HelpLayout({ children, activeSlug }: HelpLayoutProps) {
  const categories = getHelpCategories();
  const articles = getHelpArticles();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold no-underline text-foreground">
            SnapGlow
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/help" className="text-muted no-underline hover:text-foreground">
              Help center
            </Link>
            <a href="/#features" className="text-muted no-underline hover:text-foreground">
              Features
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {category}
              </p>
              <ul className="m-0 list-none space-y-1 p-0">
                {articles
                  .filter((article) => article.category === category)
                  .map((article) => (
                    <li key={article.slug}>
                      <Link
                        to="/help/$slug"
                        params={{ slug: article.slug }}
                        className={`block rounded-md px-2 py-1.5 text-sm no-underline ${
                          activeSlug === article.slug
                            ? 'bg-surface font-medium text-foreground'
                            : 'text-muted hover:bg-surface hover:text-foreground'
                        }`}
                      >
                        {article.title}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
