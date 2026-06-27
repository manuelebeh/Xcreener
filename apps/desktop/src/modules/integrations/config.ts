export function isIntegrationsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_API_URL);
}

export function getIntegrationsRedirectUri(): string {
  return 'snapglow://integrations/callback';
}
