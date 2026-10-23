/** Same Auth0 native application and callback as the desktop app. */
export const AUTH_REDIRECT_URI = 'snapglow://auth/callback';

export function getAuth0Config() {
  return {
    domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN ?? '',
    clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID ?? '',
    audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE ?? '',
  };
}

export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
}

/** Raw Ed25519 public key (base64url) matching the API's ENTITLEMENT_PRIVATE_KEY. */
export function getEntitlementPublicKey(): string {
  return process.env.EXPO_PUBLIC_ENTITLEMENT_PUBLIC_KEY ?? '';
}

export function isAccountConfigured(): boolean {
  const { domain, clientId, audience } = getAuth0Config();
  return Boolean(domain && clientId && audience);
}
