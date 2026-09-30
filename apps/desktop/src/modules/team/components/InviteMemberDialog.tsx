import type { WorkspaceRole } from '@snapglow/team-core';
import { Button, Input } from '@snapglow/ui';
import { useState } from 'react';
import { useTeamStore } from '../store';
import { RoleSelect } from './RoleSelect';

export function InviteMemberDialog() {
  const inviteMember = useTeamStore((state) => state.inviteMember);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('viewer');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    setIsLoading(true);
    setError(null);
    try {
      const url = await inviteMember(email.trim() || undefined, role);
      setInviteUrl(url);
      await navigator.clipboard.writeText(url);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : String(inviteError));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Invite member</p>
      <label htmlFor="invite-email" className="block text-xs font-medium text-muted">
        Email (optional — restricts accept to this address)
        <Input
          id="invite-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1"
          placeholder="colleague@company.com"
        />
      </label>
      <label htmlFor="invite-role" className="block text-xs font-medium text-muted">
        Role
        <div className="mt-1">
          <RoleSelect id="invite-role" value={role} onChange={setRole} />
        </div>
      </label>
      <Button type="button" size="sm" disabled={isLoading} onClick={() => void handleInvite()}>
        {isLoading ? 'Creating link…' : 'Create invite link'}
      </Button>
      {inviteUrl ? (
        <p className="text-xs text-success" role="status">
          Invite link copied to clipboard.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
