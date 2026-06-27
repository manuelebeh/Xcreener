import { Button } from '@snapglow/ui';
import { can } from '@snapglow/team-core';
import { useTeamStore } from '../store';
import { RoleSelect } from './RoleSelect';

export function MembersList() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );
  const members = useTeamStore((state) => state.members);
  const changeMemberRole = useTeamStore((state) => state.changeMemberRole);
  const removeTeamMember = useTeamStore((state) => state.removeTeamMember);
  const isAdmin = activeWorkspace?.role === 'admin';

  if (!activeWorkspace) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="m-0 text-sm font-medium">Members ({members.length})</p>
      <ul className="space-y-2">
        {members.map((member) => (
          <li
            key={member.userId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <p className="m-0 text-sm">{member.email ?? member.userId.slice(0, 8)}</p>
              <p className="m-0 text-xs text-muted">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && can('admin', 'members:update') ? (
                <>
                  <RoleSelect
                    value={member.role}
                    onChange={(role) => {
                      void changeMemberRole(member.userId, role);
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void removeTeamMember(member.userId);
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted capitalize">{member.role}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
