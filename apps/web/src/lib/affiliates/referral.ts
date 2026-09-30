const REF_COOKIE = 'sg_ref';
const REF_MAX_AGE_DAYS = 90;

function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export function setReferralCookie(code: string): void {
  if (!isBrowser() || !code.trim()) {
    return;
  }
  const maxAge = REF_MAX_AGE_DAYS * 24 * 60 * 60;
  // biome-ignore lint/suspicious/noDocumentCookie: first-party affiliate attribution cookie
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(code.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getReferralCookie(): string | null {
  if (!isBrowser()) {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

export function captureReferralFromUrl(search?: string): string | null {
  if (!isBrowser()) {
    return null;
  }
  const params = new URLSearchParams(search ?? window.location.search);
  const code = params.get('via') ?? params.get('ref');
  if (code) {
    setReferralCookie(code);
    return code;
  }
  return getReferralCookie();
}
