import { Button, Input } from '@snapglow/ui';
import { useEffect, useState } from 'react';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { useTeamStore } from '../store';
import { BillingSection } from './BillingSection';
import { BrandKitSection } from './BrandKitSection';
import { InviteMemberDialog } from './InviteMemberDialog';
import { MembersList } from './MembersList';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

export function TeamSection() {
  const configured = useCloudAuthStore((state) => state.configured);
  const isAuthenticated = useCloudAuthStore((state) => state.isAuthenticated);
  const workspaces = useTeamStore((state) => state.workspaces);
  const activeWorkspaceId = useTeamStore((state) => state.activeWorkspaceId);
  const isLoading = useTeamStore((state) => state.isLoading);
  const error = useTeamStore((state) => state.error);
  const hydrate = useTeamStore((state) => state.hydrate);
  const createTeamWorkspace = useTeamStore((state) => state.createTeamWorkspace);

  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);

  useEffect(() => {
    if (configured && isAuthenticated) {
      void hydrate();
    }
  }, [configured, isAuthenticated, hydrate]);

  if (!configured) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="m-0 text-sm font-medium">Team workspace</p>
        <p className="mt-1 text-xs text-muted">Sign in to cloud sharing to create or join a team.</p>
      </div>
    );
  }

  async function handleCreateWorkspace() {
    const name = newWorkspaceName.trim();
    if (!name) {
      return;
    }
    setCreating(true);
    try {
      await createTeamWorkspace(name);
      setNewWorkspaceName('');
    } catch (createError) {
      useTeamStore
        .getState()
        .setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-3">
      <div>
        <p className="m-0 text-sm font-medium">Team workspace</p>
        <p className="mt-1 text-xs text-muted">
          Create a shared workspace, invite members, and apply a team brand kit on exports.
        </p>
      </div>

      <WorkspaceSwitcher disabled={isLoading} />

      {workspaces.length === 0 ? (
        <div className="space-y-2">
          <label htmlFor="new-workspace-name" className="block text-sm font-medium">
            Create workspace
            <Input
              id="new-workspace-name"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              className="mt-2"
              placeholder="Acme Design"
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={creating || !newWorkspaceName.trim()}
            onClick={() => void handleCreateWorkspace()}
          >
            {creating ? 'Creating…' : 'Create workspace'}
          </Button>
        </div>
      ) : null}

      {activeWorkspace ? (
        <>
          {activeWorkspace.role === 'admin' ? <InviteMemberDialog /> : null}
          <MembersList />
          <BrandKitSection />
          <BillingSection />
        </>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
