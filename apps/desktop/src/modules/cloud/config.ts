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
