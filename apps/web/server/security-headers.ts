import { definePlugin } from 'nitro';
import { applySecurityHeaders, securityHeaders } from '../src/lib/securityHeaders';

// Route-rule headers only reach 2xx responses; this hook also covers 404, 500 and assets.
// HTML pages already carry a nonce CSP from src/start.ts, which is kept.
export default definePlugin((nitroApp) => {
  nitroApp.hooks.hook('response', (response, event) => {
    applySecurityHeaders(response, securityHeaders(new URL(event.req.url).pathname));
  });
});
