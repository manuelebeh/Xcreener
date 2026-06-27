function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Configure Auth0 in .env.local`);
  }
  return value;
}

export function getAuth0Config() {
  return {
    domain: requireEnv('VITE_AUTH0_DOMAIN'),
    clientId: requireEnv('VITE_AUTH0_CLIENT_ID'),
    audience: requireEnv('VITE_AUTH0_AUDIENCE'),
    redirectUri: 'snapglow://auth/callback',
  };
}

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
}

export function isCloudConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_AUTH0_DOMAIN &&
      import.meta.env.VITE_AUTH0_CLIENT_ID &&
      import.meta.env.VITE_AUTH0_AUDIENCE &&
      import.meta.env.VITE_API_URL
  );
}
