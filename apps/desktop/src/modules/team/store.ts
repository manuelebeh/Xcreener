import type {
  BillingStatusResponse,
  BrandKitConfig,
  MemberResponse,
  WorkspaceResponse,
} from '@snapglow/team-core';
import { create } from 'zustand';
import { setSetting } from '@/db';
import { refreshEntitlement } from '@/modules/licensing/entitlement';
import { SETTING_KEYS } from '@/shared/types/settings';
import {
  acceptInvitation,
  createCheckoutSession,
  createInvitation,
  createWorkspace,
  enableSso,
  getBillingStatus,
  getBrandKit,
  getSsoStatus,
  listMembers,
  listWorkspaces,
  removeMember,
  updateBrandKit,
  updateMemberRole,
  updateWorkspace,
} from './api';
import { openBillingPortal as openBillingPortalUrl } from './auth-invite';
import { cacheBrandKit, loadCachedBrandKit } from './brandKitCache';

interface TeamState {
  workspaces: WorkspaceResponse[];
  activeWorkspaceId: string | null;
  members: MemberResponse[];
  brandKit: BrandKitConfig | null;
  billing: BillingStatusResponse | null;
  ssoEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string | null) => Promise<void>;
  refreshMembers: () => Promise<void>;
  createTeamWorkspace: (name: string) => Promise<void>;
  renameWorkspace: (name: string) => Promise<void>;
  inviteMember: (email: string | undefined, role: MemberResponse['role']) => Promise<string>;
  acceptInviteToken: (token: string) => Promise<void>;
  changeMemberRole: (userId: string, role: MemberResponse['role']) => Promise<void>;
  removeTeamMember: (userId: string) => Promise<void>;
  refreshBilling: () => Promise<void>;
  startCheckout: (plan: 'team_starter' | 'team_pro') => Promise<void>;
  openBillingPortal: () => Promise<void>;
  refreshBrandKit: () => Promise<void>;
  saveBrandKit: (config: Pick<BrandKitConfig, 'colors' | 'fonts' | 'watermark'>) => Promise<void>;
  enableTeamSso: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  members: [],
  brandKit: null,
  billing: null,
  ssoEnabled: false,
  isLoading: false,
  error: null,

  hydrate: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await listWorkspaces();
      const storedId = get().activeWorkspaceId;
      const activeWorkspaceId =
        storedId && workspaces.some((workspace) => workspace.id === storedId) ? storedId : null;
      set({ workspaces, activeWorkspaceId, isLoading: false });
      // The plan may have changed (checkout, downgrade): re-sign it for paid features.
      await refreshEntitlement();

      if (activeWorkspaceId) {
        await get().refreshMembers();
        await get().refreshBrandKit();
        await get().refreshBilling();
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  setActiveWorkspace: async (workspaceId) => {
    set({ activeWorkspaceId: workspaceId, members: [], brandKit: null, billing: null });
    await setSetting(SETTING_KEYS.activeWorkspaceId, workspaceId ?? '');
    if (workspaceId) {
      await get().refreshMembers();
      await get().refreshBrandKit();
      await get().refreshBilling();
    }
  },

  refreshMembers: async () => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const members = await listMembers(workspaceId);
    set({ members });
  },

  createTeamWorkspace: async (name) => {
    const workspace = await createWorkspace(name);
    const workspaces = [...get().workspaces, workspace];
    set({ workspaces });
    await get().setActiveWorkspace(workspace.id);
  },

  renameWorkspace: async (name) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const updated = await updateWorkspace(workspaceId, name);
    set({
      workspaces: get().workspaces.map((workspace) =>
        workspace.id === updated.id ? updated : workspace
      ),
    });
  },

  inviteMember: async (email, role) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      throw new Error('No active workspace');
    }
    const invitation = await createInvitation(workspaceId, { email, role });
    return invitation.inviteUrl;
  },

  acceptInviteToken: async (token) => {
    const workspace = await acceptInvitation(token);
    const existing = get().workspaces.some((item) => item.id === workspace.id);
    set({
      workspaces: existing
        ? get().workspaces.map((item) => (item.id === workspace.id ? workspace : item))
        : [...get().workspaces, workspace],
    });
    await get().setActiveWorkspace(workspace.id);
  },

  changeMemberRole: async (userId, role) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    await updateMemberRole(workspaceId, userId, role);
    await get().refreshMembers();
  },

  removeTeamMember: async (userId) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    await removeMember(workspaceId, userId);
    await get().refreshMembers();
  },

  refreshBilling: async () => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const billing = await getBillingStatus(workspaceId);
    const sso = await getSsoStatus(workspaceId);
    set({ billing, ssoEnabled: sso.enabled });
  },

  startCheckout: async (plan) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      throw new Error('No active workspace');
    }
    const session = await createCheckoutSession(workspaceId, plan);
    window.open(session.url, '_blank');
  },

  openBillingPortal: async () => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      throw new Error('No active workspace');
    }
    await openBillingPortalUrl(workspaceId);
  },

  refreshBrandKit: async () => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const brandKit = await getBrandKit(workspaceId);
    await cacheBrandKit(workspaceId, brandKit);
    set({ brandKit });
  },

  saveBrandKit: async (config) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const brandKit = await updateBrandKit(workspaceId, config);
    await cacheBrandKit(workspaceId, brandKit);
    set({ brandKit });
  },

  enableTeamSso: async () => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) {
      return;
    }
    const sso = await enableSso(workspaceId);
    set({ ssoEnabled: sso.enabled });
    if (sso.setupUrl) {
      window.open(sso.setupUrl, '_blank');
    }
  },

  setError: (error) => set({ error }),
}));

export async function hydrateTeamFromSettings(activeWorkspaceId: string | null): Promise<void> {
  useTeamStore.setState({ activeWorkspaceId });
  const cached = activeWorkspaceId ? await loadCachedBrandKit(activeWorkspaceId) : null;
  if (cached) {
    useTeamStore.setState({ brandKit: cached });
  }
}

export function getActiveWorkspaceAuth0OrgId(): string | null {
  const { activeWorkspaceId, workspaces } = useTeamStore.getState();
  if (!activeWorkspaceId) {
    return null;
  }
  return workspaces.find((workspace) => workspace.id === activeWorkspaceId)?.auth0OrgId ?? null;
}
