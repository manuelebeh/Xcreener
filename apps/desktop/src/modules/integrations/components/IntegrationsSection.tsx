import { Button } from '@snapglow/ui';
import { INTEGRATION_LABELS, INTEGRATION_PROVIDERS } from '@snapglow/integrations-core';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { useIntegrationsStore } from '../store';

export function IntegrationsSection() {
  const configured = useIntegrationsStore((state) => state.configured);
  const connections = useIntegrationsStore((state) => state.connections);
  const isLoading = useIntegrationsStore((state) => state.isLoading);
  const error = useIntegrationsStore((state) => state.error);
  const connect = useIntegrationsStore((state) => state.connect);
  const disconnect = useIntegrationsStore((state) => state.disconnect);
  const isAuthenticated = useCloudAuthStore((state) => state.isAuthenticated);

  if (!configured) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="m-0 text-sm font-medium">Integrations</p>
        <p className="mt-1 text-xs text-muted">
          Configure cloud auth and API URL to connect Slack, Notion, Linear, and GitHub.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Integrations</p>
      <p className="mt-1 text-xs text-muted">
        Connect third-party apps to send exports directly. Tokens stay on this device; OAuth secrets
        are exchanged via the SnapGlow API.
      </p>

      {!isAuthenticated ? (
        <p className="mt-2 text-xs text-muted">Sign in to SnapGlow cloud above before connecting.</p>
      ) : null}

      <div className="mt-3 space-y-2">
        {INTEGRATION_PROVIDERS.map((provider) => {
          const connection = connections.find((item) => item.provider === provider);
          const isConnected = connection?.connected ?? false;
          return (
            <div
              key={provider}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{INTEGRATION_LABELS[provider]}</p>
                <p className="text-xs text-muted">
                  {isConnected ? (connection?.accountLabel ?? 'Connected') : 'Not connected'}
                </p>
              </div>
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
                  size="sm"
                  disabled={!isAuthenticated || isLoading}
                  onClick={() => connect(provider)}
                  data-testid={`integration-connect-${provider}`}
                >
                  Connect
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
