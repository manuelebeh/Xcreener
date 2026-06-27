import { SnapGlowI18nProvider, resolveLocale } from '@snapglow/i18n';
import { TanStackDevtools } from '@tanstack/react-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, HeadContent, Scripts, useSearch } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import PostHogProvider from '../integrations/posthog/provider';
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools';
import appCss from '../styles.css?url';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'SnapGlow - Screenshots that shine',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const search = useSearch({ strict: false }) as { lang?: string };
  const locale = resolveLocale(search.lang ?? null);

  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <SnapGlowI18nProvider locale={locale}>
          <PostHogProvider>
            {children}
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
          </PostHogProvider>
        </SnapGlowI18nProvider>
        <Scripts />
      </body>
    </html>
  );
}
