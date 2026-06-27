import { create } from 'zustand';
import { getCloudAccountLabel, getValidAccessToken, signOutCloud, startAuthLogin } from './auth';
import { isCloudConfigured } from './config';

interface CloudAuthState {
  configured: boolean;
  isAuthenticated: boolean;
  accountLabel: string | null;
  isLoading: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useCloudAuthStore = create<CloudAuthState>((set) => ({
  configured: isCloudConfigured(),
  isAuthenticated: false,
  accountLabel: null,
  isLoading: false,
  error: null,
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
      await startAuthLogin();
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
}));

export async function completeCloudAuthFromUrl(url: string): Promise<void> {
  const { handleAuthCallback } = await import('./auth');
  await handleAuthCallback(url);
  await useCloudAuthStore.getState().hydrate();
  useCloudAuthStore.setState({ isLoading: false });
}
