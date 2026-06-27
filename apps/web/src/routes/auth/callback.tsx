import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { clearAuthReturnTo, getAuthReturnTo, handleWebAuthCallback } from '#/modules/collab/auth';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) {
      setError('Missing Auth0 callback parameters');
      return;
    }
    void handleWebAuthCallback(code, state)
      .then(() => {
        const returnTo = getAuthReturnTo();
        clearAuthReturnTo();
        window.location.assign(returnTo);
      })
      .catch((callbackError) => {
        setError(callbackError instanceof Error ? callbackError.message : 'Auth failed');
      });
  }, []);

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
