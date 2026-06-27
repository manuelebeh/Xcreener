import { describe, expect, it } from 'vitest';
import {
  can,
  canAddMember,
  hasApiAccess,
  hasMinRole,
  isInvitationExpired,
  isPaidPlan,
  MAX_MEMBERS_TEAM_STARTER,
  maxMembersForPlan,
} from './index';

describe('team-core permissions', () => {
  it('grants admin full workspace management', () => {
    expect(can('admin', 'workspace:update')).toBe(true);
    expect(can('admin', 'invitations:create')).toBe(true);
    expect(can('admin', 'billing:manage')).toBe(true);
    expect(can('admin', 'sso:manage')).toBe(true);
  });

  it('restricts editor to read-only team actions', () => {
    expect(can('editor', 'members:read')).toBe(true);
    expect(can('editor', 'brand-kit:read')).toBe(true);
    expect(can('editor', 'invitations:create')).toBe(false);
    expect(can('editor', 'billing:manage')).toBe(false);
    expect(can('editor', 'collab:edit')).toBe(true);
    expect(can('editor', 'comments:create')).toBe(true);
  });

  it('restricts viewer to read-only collab', () => {
    expect(can('viewer', 'members:read')).toBe(true);
    expect(can('viewer', 'brand-kit:update')).toBe(false);
    expect(can('viewer', 'collab:read')).toBe(true);
    expect(can('viewer', 'collab:edit')).toBe(false);
    expect(can('viewer', 'comments:create')).toBe(true);
  });
});

describe('team-core api access', () => {
  it('grants api access only to team pro', () => {
    expect(hasApiAccess('team_pro')).toBe(true);
    expect(hasApiAccess('team_starter')).toBe(false);
    expect(hasApiAccess('free')).toBe(false);
  });
});

describe('team-core plan limits', () => {
  it('enforces team starter cap', () => {
    expect(MAX_MEMBERS_TEAM_STARTER).toBe(5);
    expect(maxMembersForPlan('team_starter')).toBe(5);
    expect(canAddMember('team_starter', 4)).toBe(true);
    expect(canAddMember('team_starter', 5)).toBe(false);
  });

  it('allows unlimited team pro members', () => {
    expect(maxMembersForPlan('team_pro')).toBeNull();
    expect(canAddMember('team_pro', 100)).toBe(true);
  });

  it('identifies paid plans', () => {
    expect(isPaidPlan('free')).toBe(false);
    expect(isPaidPlan('team_starter')).toBe(true);
    expect(isPaidPlan('team_pro')).toBe(true);
  });
});

describe('team-core invitations', () => {
  it('detects expired invitations', () => {
    const past = new Date('2026-01-01T00:00:00.000Z');
    const now = new Date('2026-06-27T00:00:00.000Z');
    expect(isInvitationExpired(past, now)).toBe(true);
    expect(isInvitationExpired(new Date('2026-12-31T00:00:00.000Z'), now)).toBe(false);
  });
});

describe('team-core role hierarchy', () => {
  it('compares role ranks', () => {
    expect(hasMinRole('admin', 'viewer')).toBe(true);
    expect(hasMinRole('viewer', 'admin')).toBe(false);
    expect(hasMinRole('editor', 'editor')).toBe(true);
  });
});
