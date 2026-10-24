import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

// No script-src yet: TanStack's inline hydration scripts need a nonce first.
const baseCsp = "object-src 'none'; base-uri 'self'; form-action 'self'";
const notionFrameAncestors =
  "frame-ancestors 'self' https://www.notion.so https://notion.so https://*.notion.so";

const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': `${baseCsp}; frame-ancestors 'self'`,
};

// Share, embed and collab URLs carry a capability token: never leak it through Referer.
const tokenPageHeaders = { 'Referrer-Policy': 'no-referrer' };

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      routeRules: {
        '/**': { headers: securityHeaders },
        '/s/**': { headers: tokenPageHeaders },
        '/c/**': { headers: tokenPageHeaders },
        // Notion frames the embed page, so only this route allows a third-party ancestor.
        '/e/**': {
          headers: {
            ...tokenPageHeaders,
            'Content-Security-Policy': `${baseCsp}; ${notionFrameAncestors}`,
          },
        },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
