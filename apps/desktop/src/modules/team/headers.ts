import { useTeamStore } from './store';

export function getWorkspaceHeaders(): Record<string, string> {
  const activeWorkspaceId = useTeamStore.getState().activeWorkspaceId;
  if (!activeWorkspaceId) {
    return {};
  }
  return { 'X-Workspace-Id': activeWorkspaceId };
}

export function getActiveWorkspaceId(): string | null {
  return useTeamStore.getState().activeWorkspaceId;
}
