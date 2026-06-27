import type { ApiKeyResponse, CreateApiKeyResponse } from '@snapglow/api-core';
import { Button, Input } from '@snapglow/ui';
import { hasApiAccess } from '@snapglow/team-core';
import { useCallback, useEffect, useState } from 'react';
import { useTeamStore } from '../store';
import { createApiKey, listApiKeys, revokeApiKey } from '../api-keys';

export function ApiKeysSection() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );

  const [keys, setKeys] = useState<ApiKeyResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreateApiKeyResponse | null>(null);

  const loadKeys = useCallback(async () => {
    if (!activeWorkspace?.id || !hasApiAccess(activeWorkspace.plan)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await listApiKeys(activeWorkspace.id);
      setKeys(items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, activeWorkspace?.plan]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  if (!activeWorkspace || activeWorkspace.role !== 'admin') {
    return null;
  }

  if (!hasApiAccess(activeWorkspace.plan)) {
    return (
      <div className="space-y-2 rounded-md border border-border p-3">
        <p className="m-0 text-sm font-medium">API keys</p>
        <p className="m-0 text-xs text-muted">
          Upgrade to Team Pro to create API keys for VS Code, Figma, and Notion plugins.
        </p>
      </div>
    );
  }

  async function handleCreateKey() {
    const name = newKeyName.trim();
    if (!name || !activeWorkspace) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createApiKey(activeWorkspace.id, name);
      setRevealedKey(created);
      setNewKeyName('');
      await loadKeys();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(keyId: string) {
    if (!activeWorkspace) {
      return;
    }
    setError(null);
    try {
      await revokeApiKey(activeWorkspace.id, keyId);
      await loadKeys();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : String(revokeError));
    }
  }

  async function copyRevealedKey() {
    if (!revealedKey) {
      return;
    }
    await navigator.clipboard.writeText(revealedKey.key);
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">API keys</p>
      <p className="m-0 text-xs text-muted">
        Create keys for plugins and automation. The full key is shown once on creation.
      </p>

      {revealedKey ? (
        <div className="space-y-2 rounded-md border border-accent/40 bg-accent/5 p-3">
          <p className="m-0 text-xs font-medium text-foreground">New API key — copy now</p>
          <code className="block break-all rounded bg-surface px-2 py-1 text-xs">{revealedKey.key}</code>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => void copyRevealedKey()}>
              Copy key
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setRevealedKey(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor="api-key-name" className="flex-1 text-sm">
          Key name
          <Input
            id="api-key-name"
            value={newKeyName}
            onChange={(event) => setNewKeyName(event.target.value)}
            placeholder="VS Code — MacBook"
            className="mt-1"
          />
        </label>
        <Button
          type="button"
          size="sm"
          disabled={creating || !newKeyName.trim()}
          onClick={() => void handleCreateKey()}
        >
          {creating ? 'Creating…' : 'Create key'}
        </Button>
      </div>

      {loading ? <p className="text-xs text-muted">Loading keys…</p> : null}

      {keys.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
            >
              <div>
                <p className="m-0 font-medium">{key.name}</p>
                <p className="m-0 text-muted">
                  {key.keyPrefix}… · created {new Date(key.createdAt).toLocaleDateString()}
                  {key.lastUsedAt
                    ? ` · last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => void handleRevoke(key.id)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        !loading && <p className="text-xs text-muted">No API keys yet.</p>
      )}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
