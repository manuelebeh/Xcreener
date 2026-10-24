import { Button, Input } from '@snapglow/ui';
import { useEffect, useState } from 'react';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { SettingsGroup, SettingsRow } from '@/shared/components/SettingsGroup';
import { useTeamStore } from '../store';
import { ApiKeysSection } from './ApiKeysSection';
import { BillingSection } from './BillingSection';
import { BrandKitSection } from './BrandKitSection';
import { InviteMemberDialog } from './InviteMemberDialog';
import { MembersList } from './MembersList';
import { UsageReportsSection } from './UsageReportsSection';
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
  const [renameDraft, setRenameDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const renameWorkspace = useTeamStore((state) => state.renameWorkspace);

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
      <SettingsGroup title="Team workspace">
        <SettingsRow
          label="Not signed in"
          hint="Sign in to cloud sharing to create or join a team."
        />
      </SettingsGroup>
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

  async function handleRenameWorkspace() {
    const name = (renameDraft.trim() || activeWorkspace?.name || '').trim();
    if (!name) {
      return;
    }
    setRenaming(true);
    try {
      await renameWorkspace(name);
      setRenameDraft('');
    } catch (renameError) {
      useTeamStore
        .getState()
        .setError(renameError instanceof Error ? renameError.message : String(renameError));
    } finally {
      setRenaming(false);
    }
  }

  return (
    <SettingsGroup
      title="Team workspace"
      description="Create a shared workspace, invite members, and apply a team brand kit on exports."
    >
      <div className="space-y-4 p-4">
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
            {activeWorkspace.role === 'admin' ? (
              <div className="space-y-2">
                <label htmlFor="rename-workspace" className="block text-sm font-medium">
                  Workspace name
                  <Input
                    id="rename-workspace"
                    value={renameDraft || activeWorkspace.name}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    className="mt-2"
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={
                    renaming ||
                    !(renameDraft.trim() || activeWorkspace.name) ||
                    (renameDraft.trim() || activeWorkspace.name) === activeWorkspace.name
                  }
                  onClick={() => void handleRenameWorkspace()}
                >
                  {renaming ? 'Saving…' : 'Rename workspace'}
                </Button>
              </div>
            ) : null}
            {activeWorkspace.role === 'admin' ? <InviteMemberDialog /> : null}
            <MembersList />
            <BrandKitSection />
            <ApiKeysSection />
            <BillingSection />
            <UsageReportsSection />
          </>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={() => void hydrate()}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </SettingsGroup>
  );
}
