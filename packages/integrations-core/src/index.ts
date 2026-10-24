export type IntegrationProvider =
  | 'slack'
  | 'notion'
  | 'linear'
  | 'github'
  | 'jira'
  | 'confluence'
  | 'msteams';

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  'slack',
  'notion',
  'linear',
  'github',
  'jira',
  'confluence',
  'msteams',
];

export const ENTERPRISE_INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  'jira',
  'confluence',
  'msteams',
];

export const INTEGRATION_LABELS: Record<IntegrationProvider, string> = {
  slack: 'Slack',
  notion: 'Notion',
  linear: 'Linear',
  github: 'GitHub',
  jira: 'Jira',
  confluence: 'Confluence',
  msteams: 'Microsoft Teams',
};

export const INTEGRATION_SCOPES: Record<IntegrationProvider, string> = {
  slack: 'files:write,chat:write,channels:read',
  notion: 'read,update,insert',
  linear: 'read,write,issues:create',
  github: 'repo',
  jira: 'read:jira-work write:jira-work read:me offline_access',
  confluence: 'read:confluence-content.all write:confluence-content.all offline_access',
  msteams: 'ChannelMessage.Send Channel.ReadBasic.All offline_access',
};

export const INTEGRATION_REDIRECT_URI = 'snapglow://integrations/callback';

export interface IntegrationConnection {
  provider: IntegrationProvider;
  connectedAt: string;
  accountLabel?: string;
  teamId?: string;
  workspaceId?: string;
  cloudId?: string;
}

export interface SendToIntegrationInput {
  provider: IntegrationProvider;
  blob: Blob;
  filename: string;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface AuthorizeIntegrationResponse {
  authorizeUrl: string;
  state: string;
}

export interface ExchangeIntegrationTokenResponse {
  accessToken: string;
  /**
   * Sealed by the API (bound to the user and provider). Only the API can turn it into a new
   * access token, through `POST /v1/integrations/:provider/refresh`.
   */
  refreshHandle?: string | null;
  expiresAt?: string | null;
  scope?: string;
  workspaceName?: string | null;
  metadata?: Record<string, string>;
}

export interface RefreshIntegrationTokenResponse {
  accessToken: string;
  refreshHandle: string;
  expiresAt?: string | null;
}

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function isEnterpriseIntegrationProvider(value: IntegrationProvider): boolean {
  return (ENTERPRISE_INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}
