import { useTranslation } from '@xcreener/i18n';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

type ConsentStatus = 'granted' | 'denied' | 'pending';

/** Asks once for analytics consent; the choice is remembered by PostHog itself. */
export function ConsentBanner() {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<ConsentStatus | null>(null);

  // Read after mount so server and client render the same markup.
  useEffect(() => {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      setStatus(posthog.get_explicit_consent_status());
    }
  }, []);

  if (status !== 'pending') {
    return null;
  }

  const choose = (accepted: boolean) => {
    if (accepted) {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
    setStatus(accepted ? 'granted' : 'denied');
  };

  return (
    <section
      aria-label={t('consentTitle')}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-foreground shadow-lg sm:flex-row sm:items-center"
    >
      <p className="flex-1 text-muted">{t('consentBody')}</p>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-9 rounded-lg border border-border px-4 hover:opacity-80"
          onClick={() => choose(false)}
        >
          {t('consentDecline')}
        </button>
        <button
          type="button"
          className="h-9 rounded-lg bg-primary px-4 text-white hover:opacity-90"
          onClick={() => choose(true)}
        >
          {t('consentAccept')}
        </button>
      </div>
    </section>
  );
}
