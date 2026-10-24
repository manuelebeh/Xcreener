import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { clearAuthReturnTo, getAuthReturnTo, handleWebAuthCallback } from '#/modules/collab/auth';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const returnTo = getAuthReturnTo();
    // Silent sign-in without an Auth0 session: go back, the page shows the sign-in button.
    if (params.get('error')) {
      clearAuthReturnTo();
      void router.navigate({ href: returnTo, replace: true });
      return;
    }
    if (!code || !state) {
      setError('Missing Auth0 callback parameters');
      return;
    }
    void handleWebAuthCallback(code, state)
      .then(() => {
        clearAuthReturnTo();
        // Client-side navigation: a full reload would drop the in-memory tokens.
        void router.navigate({ href: returnTo, replace: true });
      })
      .catch((callbackError) => {
        setError(callbackError instanceof Error ? callbackError.message : 'Auth failed');
      });
  }, [router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-muted">Completing sign in…</p>
      )}
    </main>
  );
}
