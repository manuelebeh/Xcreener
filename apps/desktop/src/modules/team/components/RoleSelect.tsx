import type { WorkspaceRole } from '@snapglow/team-core';
import { Select } from '@snapglow/ui';

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

interface RoleSelectProps {
  value: WorkspaceRole;
  onChange: (role: WorkspaceRole) => void;
  disabled?: boolean;
  id?: string;
}

export function RoleSelect({ value, onChange, disabled, id }: RoleSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as WorkspaceRole)}
      className="text-xs"
    >
      {(Object.keys(ROLE_LABELS) as WorkspaceRole[]).map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </Select>
  );
}
