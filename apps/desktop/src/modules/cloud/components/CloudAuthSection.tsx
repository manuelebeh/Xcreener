import { Button } from '@snapglow/ui';
import { useEffect } from 'react';
import { SettingsGroup, SettingsRow } from '@/shared/components/SettingsGroup';
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
          hint="Sign in to upload captures and create share links. Uploads always need your consent from the editor."
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
    </SettingsGroup>
  );
}
