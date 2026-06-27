import { useTeamStore } from '../store';

interface WorkspaceSwitcherProps {
  disabled?: boolean;
}

export function WorkspaceSwitcher({ disabled }: WorkspaceSwitcherProps) {
  const workspaces = useTeamStore((state) => state.workspaces);
  const activeWorkspaceId = useTeamStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useTeamStore((state) => state.setActiveWorkspace);

  return (
    <label htmlFor="workspace-switcher" className="block text-sm font-medium">
      Active workspace
      <select
        id="workspace-switcher"
        className="sg-focus-ring mt-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        value={activeWorkspaceId ?? ''}
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          void setActiveWorkspace(value || null);
        }}
      >
        <option value="">Personal</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} ({workspace.plan})
          </option>
        ))}
      </select>
    </label>
  );
}
