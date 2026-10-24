const baseCsp = "object-src 'none'; base-uri 'self'; form-action 'self'";
// Notion frames the embed page, so only /e/* allows a third-party ancestor.
const notionFrameAncestors =
  "frame-ancestors 'self' https://www.notion.so https://notion.so https://*.notion.so";

/**
 * Headers for every web response. `nonce` adds a script-src for TanStack's inline
 * hydration scripts; without it (dev, Nitro error pages, assets) scripts are not restricted.
 */
export function securityHeaders(pathname: string, nonce?: string): Record<string, string> {
  const csp = [
    baseCsp,
    pathname.startsWith('/e/') ? notionFrameAncestors : "frame-ancestors 'self'",
    ...(nonce ? [`script-src 'nonce-${nonce}' 'strict-dynamic'`] : []),
  ].join('; ');
  // Share, embed and collab URLs carry a capability token: never leak it through Referer.
  const carriesToken = /^\/(s|e|c)\//.test(pathname);

  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': carriesToken ? 'no-referrer' : 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': csp,
  };
}

/** Sets each header the response does not have yet. Some responses have immutable headers. */
export function applySecurityHeaders(response: Response, headers: Record<string, string>): void {
  for (const [name, value] of Object.entries(headers)) {
    if (response.headers.has(name)) {
      continue;
    }
    try {
      response.headers.set(name, value);
    } catch {
      return;
    }
  }
}
