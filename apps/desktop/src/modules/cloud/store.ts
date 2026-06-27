import { create } from 'zustand';
import { getCloudAccountLabel, getValidAccessToken, signOutCloud } from './auth';
import { isCloudConfigured } from './config';

interface CloudAuthState {
  configured: boolean;
  isAuthenticated: boolean;
  accountLabel: string | null;
  isLoading: boolean;
  error: string | null;
  lastLibrarySyncAt: string | null;
  librarySyncError: string | null;
  hydrate: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (error: string | null) => void;
  setLibrarySyncStatus: (status: { at?: string; error?: string | null }) => void;
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  configured: isCloudConfigured(),
  isAuthenticated: false,
  accountLabel: null,
  isLoading: false,
  error: null,
  lastLibrarySyncAt: null,
  librarySyncError: null,
  hydrate: async () => {
    if (!isCloudConfigured()) {
      set({ configured: false, isAuthenticated: false, accountLabel: null });
      return;
    }

    const token = await getValidAccessToken();
    const accountLabel = token ? await getCloudAccountLabel() : null;
    set({
      configured: true,
      isAuthenticated: Boolean(token),
      accountLabel,
      error: null,
    });
  },
  signIn: async () => {
    set({ isLoading: true, error: null });
    try {
      const { getActiveWorkspaceAuth0OrgId } = await import('@/modules/team/store');
      const organization = getActiveWorkspaceAuth0OrgId();
      const { startAuthLoginWithOrganization } = await import('./auth');
      await startAuthLoginWithOrganization(organization);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  },
  signOut: async () => {
    await signOutCloud();
    set({ isAuthenticated: false, accountLabel: null, error: null });
  },
  setError: (error) => set({ error }),
  setLibrarySyncStatus: ({ at, error }) =>
    set((state) => ({
      lastLibrarySyncAt: at ?? state.lastLibrarySyncAt,
      librarySyncError: error === undefined ? state.librarySyncError : error,
    })),
}));

export async function completeCloudAuthFromUrl(url: string): Promise<void> {
  const { handleAuthCallback } = await import('./auth');
  await handleAuthCallback(url);
  await useCloudAuthStore.getState().hydrate();
  useCloudAuthStore.setState({ isLoading: false });
}
