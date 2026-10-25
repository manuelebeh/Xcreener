import {
  INTEGRATION_LABELS,
  INTEGRATION_PROVIDERS,
  isEnterpriseIntegrationProvider,
} from '@xcreener/integrations-core';
import { Button } from '@xcreener/ui';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { hasEnterpriseIntegrationsAccess } from '@/modules/licensing/premiumAccess';
import { SettingsGroup, SettingsRow } from '@/shared/components/SettingsGroup';
import { useIntegrationsStore } from '../store';

export function IntegrationsSection() {
  const configured = useIntegrationsStore((state) => state.configured);
  const connections = useIntegrationsStore((state) => state.connections);
  const isLoading = useIntegrationsStore((state) => state.isLoading);
  const error = useIntegrationsStore((state) => state.error);
  const connect = useIntegrationsStore((state) => state.connect);
  const disconnect = useIntegrationsStore((state) => state.disconnect);
  const isAuthenticated = useCloudAuthStore((state) => state.isAuthenticated);
  const enterpriseAccess = hasEnterpriseIntegrationsAccess();

  if (!configured) {
    return (
      <SettingsGroup title="Integrations">
        <SettingsRow
          label="Not configured"
          hint="Configure cloud auth and the API URL to connect Slack, Notion, Linear, and GitHub."
        />
      </SettingsGroup>
    );
  }

  return (
    <SettingsGroup
      title="Integrations"
      description={
        isAuthenticated
          ? 'Send exports straight to third-party apps. Tokens stay on this device. Jira, Confluence, and Teams require Team Pro.'
          : 'Sign in to Xcreener cloud above before connecting.'
      }
    >
      {INTEGRATION_PROVIDERS.map((provider) => {
        const connection = connections.find((item) => item.provider === provider);
        const isConnected = connection?.connected ?? false;
        const enterpriseLocked = isEnterpriseIntegrationProvider(provider) && !enterpriseAccess;
        const statusLabel = isConnected
          ? (connection?.accountLabel ?? 'Connected')
          : enterpriseLocked
            ? 'Team Pro required'
            : 'Not connected';
        return (
          <SettingsRow key={provider} label={INTEGRATION_LABELS[provider]} hint={statusLabel}>
            {isConnected ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => disconnect(provider)}
                data-testid={`integration-disconnect-${provider}`}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!isAuthenticated || isLoading || enterpriseLocked}
                onClick={() => connect(provider)}
                data-testid={`integration-connect-${provider}`}
              >
                Connect
              </Button>
            )}
          </SettingsRow>
        );
      })}
      {error ? (
        <p className="px-4 py-3 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </SettingsGroup>
  );
}
