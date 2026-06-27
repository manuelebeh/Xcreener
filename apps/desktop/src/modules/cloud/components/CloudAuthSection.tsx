import { Button } from '@snapglow/ui';
import { useCloudAuthStore } from '../store';

export function CloudAuthSection() {
  const configured = useCloudAuthStore((state) => state.configured);
  const isAuthenticated = useCloudAuthStore((state) => state.isAuthenticated);
  const accountLabel = useCloudAuthStore((state) => state.accountLabel);
  const isLoading = useCloudAuthStore((state) => state.isLoading);
  const error = useCloudAuthStore((state) => state.error);
  const lastLibrarySyncAt = useCloudAuthStore((state) => state.lastLibrarySyncAt);
  const librarySyncError = useCloudAuthStore((state) => state.librarySyncError);
  const signIn = useCloudAuthStore((state) => state.signIn);
  const signOut = useCloudAuthStore((state) => state.signOut);

  if (!configured) {
    return (
      <div className="rounded-md border border-border p-3">
        <p className="m-0 text-sm font-medium">Cloud sharing</p>
        <p className="mt-1 text-xs text-muted">
          Set VITE_AUTH0_* and VITE_API_URL in `.env.local` to enable cloud links.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Cloud sharing</p>
      <p className="mt-1 text-xs text-muted">
        Sign in to upload captures and create shareable links. Uploads require your explicit
        consent from the editor.
      </p>
      {isAuthenticated ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{accountLabel ?? 'Signed in'}</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="mt-3"
          disabled={isLoading}
          onClick={() => signIn()}
          data-testid="cloud-sign-in-button"
        >
          {isLoading ? 'Waiting for browser…' : 'Sign in with Auth0'}
        </Button>
      )}
      {error ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error.includes('PKCE') || error.includes('state')
            ? 'Sign-in expired or was interrupted. Close the browser tab and try again.'
            : error}
        </p>
      ) : null}
      {isAuthenticated && lastLibrarySyncAt ? (
        <p className="mt-2 text-xs text-muted">
          Last library sync: {new Date(lastLibrarySyncAt).toLocaleString()}
        </p>
      ) : null}
      {librarySyncError ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          Library sync failed: {librarySyncError}
        </p>
      ) : null}
    </div>
  );
}
