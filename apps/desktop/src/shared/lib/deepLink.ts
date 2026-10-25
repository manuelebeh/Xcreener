/**
 * Route of a `xcreener://` deep link, e.g. `auth/callback`.
 * WebViews disagree on custom-scheme parsing: older engines give pathname `//auth/callback`,
 * WHATWG-compliant ones give host `auth` and pathname `/callback`.
 */
export function deepLinkRoute(url: URL): string | null {
  if (url.protocol !== 'xcreener:') {
    return null;
  }
  return `${url.host}${url.pathname}`.replace(/^\/+/, '').replace(/\/+$/, '');
}
