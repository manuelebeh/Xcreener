import { Button } from '@snapglow/ui';
import { ask } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import { setSetting } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';
import { SettingsGroup, SettingsRow, SettingsToggle } from '@/shared/components/SettingsGroup';
import { SETTING_KEYS } from '@/shared/types/settings';
import { deleteCloudAccount } from '../deleteAccount';
import { useCloudAuthStore } from '../store';
import { pullCloudSync, startPeriodicSync } from '../syncPull';

export function CloudAuthSection() {
  const configured = useCloudAuthStore((state) => state.configured);
  const isAuthenticated = useCloudAuthStore((state) => state.isAuthenticated);
  const accountLabel = useCloudAuthStore((state) => state.accountLabel);
  const isLoading = useCloudAuthStore((state) => state.isLoading);
  const error = useCloudAuthStore((state) => state.error);
  const lastLibrarySyncAt = useCloudAuthStore((state) => state.lastLibrarySyncAt);
  const librarySyncError = useCloudAuthStore((state) => state.librarySyncError);
  const lastPulledCount = useCloudAuthStore((state) => state.lastPulledCount);
  const signIn = useCloudAuthStore((state) => state.signIn);
  const signOut = useCloudAuthStore((state) => state.signOut);
  const cloudLibrarySync = useSettingsStore((state) => state.cloudLibrarySync);
  const setCloudLibrarySync = useSettingsStore((state) => state.setCloudLibrarySync);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleCloudLibrarySyncChange(enabled: boolean) {
    setCloudLibrarySync(enabled);
    await setSetting(SETTING_KEYS.cloudLibrarySync, String(enabled));
  }

  async function handleDeleteAccount() {
    const confirmed = await ask(
      'This permanently deletes your SnapGlow cloud account, your cloud library, share links and any workspace where you are the only member. Captures saved on this device are kept.',
      {
        title: 'Delete cloud account',
        kind: 'warning',
        okLabel: 'Delete account',
        cancelLabel: 'Cancel',
      }
    );
    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteCloudAccount();
      await signOut();
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Account deletion failed');
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    return startPeriodicSync(60_000);
  }, [isAuthenticated]);

  if (!configured) {
    return (
      <SettingsGroup title="Cloud sharing">
        <SettingsRow
          label="Not configured"
          hint="Set VITE_AUTH0_* and VITE_API_URL in .env.local to enable cloud links."
        />
      </SettingsGroup>
    );
  }

  const errors = (
    <>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error.includes('PKCE') || error.includes('state')
            ? 'Sign-in expired or was interrupted. Close the browser tab and try again.'
            : error}
        </p>
      ) : null}
      {librarySyncError ? (
        <p className="text-xs text-destructive" role="alert">
          Library sync failed: {librarySyncError}
        </p>
      ) : null}
    </>
  );

  if (!isAuthenticated) {
    return (
      <SettingsGroup title="Cloud sharing">
        <SettingsRow
          label="SnapGlow cloud"
          hint="Sign in to create share links. Nothing is uploaded unless you share a capture or turn on library backup."
          footer={error || librarySyncError ? errors : null}
        >
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={() => signIn()}
            data-testid="cloud-sign-in-button"
          >
            {isLoading ? 'Waiting for browser…' : 'Sign in with Auth0'}
          </Button>
        </SettingsRow>
      </SettingsGroup>
    );
  }

  const syncHint = lastLibrarySyncAt
    ? `Last sync ${new Date(lastLibrarySyncAt).toLocaleString()}${
        lastPulledCount > 0 ? ` · ${lastPulledCount} updates pulled` : ''
      }`
    : 'Not synced yet';

  return (
    <SettingsGroup title="Cloud sharing">
      <SettingsRow
        label={accountLabel ?? 'Signed in'}
        hint={syncHint}
        footer={error || librarySyncError ? errors : null}
      >
        <Button type="button" variant="ghost" size="sm" onClick={() => void pullCloudSync()}>
          Sync now
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => signOut()}>
          Sign out
        </Button>
      </SettingsRow>
      <SettingsToggle
        id="cloud-library-sync"
        label="Back up new captures to my cloud library"
        hint="Uploads the original image and its recognized text to your personal library. Off by default."
        checked={cloudLibrarySync}
        onChange={handleCloudLibrarySyncChange}
        testId="cloud-library-sync-toggle"
      />
      <SettingsRow
        label="Delete cloud account"
        hint="Erases your account and everything stored in SnapGlow cloud. Local captures stay."
        footer={
          deleteError ? (
            <p className="text-xs text-destructive" role="alert">
              {deleteError}
            </p>
          ) : null
        }
      >
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isDeleting}
          onClick={() => void handleDeleteAccount()}
          data-testid="cloud-delete-account-button"
        >
          {isDeleting ? 'Deleting…' : 'Delete account'}
        </Button>
      </SettingsRow>
    </SettingsGroup>
  );
}
