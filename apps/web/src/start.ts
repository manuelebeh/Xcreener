import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start';
import { applySecurityHeaders, securityHeaders } from './lib/securityHeaders';

// Defining a start instance replaces Start's default CSRF check for server functions.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

/**
 * Per-request nonce for the inline hydration scripts. The router reads it from the start
 * context (src/router.tsx). Production only: Vite dev injects its own inline scripts.
 */
const cspNonceMiddleware = createMiddleware().server(async ({ next, pathname }) => {
  const nonce = import.meta.env.PROD ? createNonce() : undefined;
  const result = await next({ context: { nonce } });
  if (nonce) {
    applySecurityHeaders(result.response, securityHeaders(pathname, nonce));
  }
  return result;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, cspNonceMiddleware],
}));
