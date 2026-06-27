import { Button, Input, Label, Select } from '@snapglow/ui';
import type { IntegrationProvider } from '@snapglow/integrations-core';
import { useCallback, useEffect, useState } from 'react';
import { integrationLabel, useIntegrationsStore } from '../store';
import {
  listGitHubIssues,
  listGitHubRepos,
  listJiraIssues,
  listConfluencePages,
  listLinearIssues,
  listLinearTeams,
  listNotionPages,
  listSlackChannels,
  listTeamsChannels,
  sendToProvider,
} from '../sendToIntegration';

interface DestinationOption {
  id: string;
  label: string;
}

interface SendToIntegrationDialogProps {
  provider: IntegrationProvider;
  onClose: () => void;
  onSent: (message: string, url?: string) => void;
  exportBlob: Blob;
  filename: string;
  mimeType: string;
}

export function SendToIntegrationDialog({
  provider,
  onClose,
  onSent,
  exportBlob,
  filename,
  mimeType,
}: SendToIntegrationDialogProps) {
  const connections = useIntegrationsStore((state) => state.connections);
  const isConnected = connections.some(
    (connection) => connection.provider === provider && connection.connected
  );
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [secondaryDestinations, setSecondaryDestinations] = useState<DestinationOption[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [secondaryDestinationId, setSecondaryDestinationId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDestinations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      switch (provider) {
        case 'slack': {
          const channels = await listSlackChannels();
          setDestinations(channels.map((channel) => ({ id: channel.id, label: `#${channel.name}` })));
          break;
        }
        case 'notion': {
          const pages = await listNotionPages();
          setDestinations(pages.map((page) => ({ id: page.id, label: page.title })));
          break;
        }
        case 'linear': {
          const teams = await listLinearTeams();
          setDestinations(teams.map((team) => ({ id: team.id, label: team.name })));
          break;
        }
        case 'github': {
          const repos = await listGitHubRepos();
          setDestinations(repos.map((repo) => ({ id: repo.fullName, label: repo.fullName })));
          break;
        }
        case 'jira': {
          const issues = await listJiraIssues();
          setDestinations(
            issues.map((issue) => ({ id: issue.id, label: `${issue.key}: ${issue.summary}` }))
          );
          break;
        }
        case 'confluence': {
          const pages = await listConfluencePages();
          setDestinations(pages.map((page) => ({ id: page.id, label: page.title })));
          break;
        }
        case 'msteams': {
          const channels = await listTeamsChannels();
          setDestinations(
            channels.map((channel) => ({
              id: `${channel.teamId}|${channel.id}`,
              label: channel.name,
            }))
          );
          break;
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!isConnected) {
      setError(`Connect ${integrationLabel(provider)} in Settings first`);
      setLoading(false);
      return;
    }
    void loadDestinations();
  }, [isConnected, loadDestinations, provider]);

  useEffect(() => {
    if (!destinationId) {
      setSecondaryDestinations([]);
      setSecondaryDestinationId('');
      return;
    }

    if (provider !== 'linear' && provider !== 'github') {
      return;
    }

    void (async () => {
      try {
        if (provider === 'linear') {
          const issues = await listLinearIssues(destinationId);
          setSecondaryDestinations(
            [
              { id: '', label: 'Create new issue' },
              ...issues.map((issue) => ({
                id: issue.id,
                label: `${issue.identifier} · ${issue.title}`,
              })),
            ]
          );
        }

        if (provider === 'github') {
          const issues = await listGitHubIssues(destinationId);
          setSecondaryDestinations(
            [
              { id: '', label: 'Create new issue' },
              ...issues.map((issue) => ({
                id: String(issue.number),
                label: `#${issue.number} · ${issue.title}`,
              })),
            ]
          );
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    })();
  }, [destinationId, provider]);

  async function handleSend() {
    if (!destinationId) {
      setError('Choose a destination');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const destination = destinations.find((item) => item.id === destinationId);
      const secondary = secondaryDestinations.find((item) => item.id === secondaryDestinationId);
      const result = await sendToProvider({
        provider,
        blob: exportBlob,
        filename,
        mimeType,
        message: message.trim() || undefined,
        destinationId: secondaryDestinationId || destinationId,
        destinationLabel: secondary?.label || destination?.label || destinationId,
        secondaryDestinationId: secondaryDestinationId ? destinationId : undefined,
        secondaryDestinationLabel: secondaryDestinationId ? destination?.label : undefined,
      });
      onSent(result.message, result.url);
      onClose();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : String(sendError));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      data-testid="send-integration-dialog"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-4 shadow-lg">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Send to {integrationLabel(provider)}</h2>
          <p className="text-xs text-muted">Choose where to deliver this export.</p>
        </header>

        {loading ? <p className="text-xs text-muted">Loading destinations…</p> : null}

        {!loading ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="integration-destination">Destination</Label>
              <Select
                id="integration-destination"
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
              >
                <option value="">Select…</option>
                {destinations.map((destination) => (
                  <option key={destination.id} value={destination.id}>
                    {destination.label}
                  </option>
                ))}
              </Select>
            </div>

            {secondaryDestinations.length > 0 ? (
              <div className="space-y-1">
                <Label htmlFor="integration-secondary">Issue</Label>
                <Select
                  id="integration-secondary"
                  value={secondaryDestinationId}
                  onChange={(event) => setSecondaryDestinationId(event.target.value)}
                >
                  {secondaryDestinations.map((destination) => (
                    <option key={destination.id || 'new'} value={destination.id}>
                      {destination.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="integration-message">Message (optional)</Label>
              <Input
                id="integration-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Add context for recipients"
              />
            </div>
          </>
        ) : null}

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void handleSend()} disabled={sending || loading}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
