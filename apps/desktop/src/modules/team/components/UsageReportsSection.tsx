import type { UsagePeriod, WorkspaceUsageResponse } from '@snapglow/team-core';
import { Button } from '@snapglow/ui';
import { useCallback, useEffect, useState } from 'react';
import { getWorkspaceUsage } from '../api';
import { useTeamStore } from '../store';

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UsageReportsSection() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );

  const [period, setPeriod] = useState<UsagePeriod>('30d');
  const [usage, setUsage] = useState<WorkspaceUsageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async () => {
    if (!activeWorkspace?.id) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkspaceUsage(activeWorkspace.id, period);
      setUsage(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, period]);

  useEffect(() => {
    void loadUsage();
  }, [loadUsage]);

  if (activeWorkspace?.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm font-medium">Usage reports</p>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={period === value ? 'primary' : 'secondary'}
              onClick={() => setPeriod(value)}
            >
              {value}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-xs text-muted">Loading usage…</p> : null}

      {usage ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-md border border-border p-2">
              <p className="m-0 text-muted">Library captures</p>
              <p className="m-0 text-lg font-semibold">{usage.totals.libraryCaptures}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="m-0 text-muted">Cloud shares</p>
              <p className="m-0 text-lg font-semibold">{usage.totals.shares}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="m-0 text-muted">API captures</p>
              <p className="m-0 text-lg font-semibold">{usage.totals.apiCaptures}</p>
            </div>
            <div className="rounded-md border border-border p-2">
              <p className="m-0 text-muted">Exports</p>
              <p className="m-0 text-lg font-semibold">{usage.totals.exportCount}</p>
            </div>
            <div className="rounded-md border border-border p-2 sm:col-span-2">
              <p className="m-0 text-muted">Cloud storage</p>
              <p className="m-0 text-lg font-semibold">{formatBytes(usage.totals.storageBytes)}</p>
            </div>
          </div>

          {usage.byMember.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="py-1 pr-2 font-medium">Member</th>
                    <th className="py-1 pr-2 font-medium">Captures</th>
                    <th className="py-1 pr-2 font-medium">Shares</th>
                    <th className="py-1 font-medium">Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.byMember.map((member) => (
                    <tr key={member.userId} className="border-b border-border/50">
                      <td className="py-1 pr-2">{member.email ?? member.userId.slice(0, 8)}</td>
                      <td className="py-1 pr-2">{member.libraryCaptures}</td>
                      <td className="py-1 pr-2">{member.shares}</td>
                      <td className="py-1">{formatBytes(member.storageBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted">No member activity in this period.</p>
          )}
        </>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => void loadUsage()}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
