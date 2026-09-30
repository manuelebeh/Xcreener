import { useTranslation } from '@snapglow/i18n';
import { Button } from '@snapglow/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { captureReferralFromUrl } from '#/lib/affiliates/referral';
import { useLandingCtaExperiment, usePricingExperiment } from '#/lib/experiments/useExperiment';

const linkButtonPrimary =
  'inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground no-underline transition-opacity hover:opacity-90';

const linkButtonSecondary =
  'inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-medium text-foreground no-underline transition-opacity hover:opacity-80';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'SnapGlow - Screenshots that shine' },
      {
        name: 'description',
        content:
          'Transform any screenshot into a professional visual in under 5 seconds. Privacy-first, local-first.',
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { t: tc } = useTranslation('common');
  const { t: tm } = useTranslation('marketing');

  const ctaVariant = useLandingCtaExperiment();
  const pricingVariant = usePricingExperiment();

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  const features = [
    { title: tm('featureCaptureTitle'), description: tm('featureCaptureDesc') },
    { title: tm('featureBeautifyTitle'), description: tm('featureBeautifyDesc') },
    { title: tm('featureShareTitle'), description: tm('featureShareDesc') },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">{tc('appName')}</span>
        <nav className="flex items-center gap-4 text-sm">
          <a
            href="/marketplace"
            className="font-medium text-muted no-underline hover:text-foreground"
          >
            {tc('marketplace')}
          </a>
          <a
            href="/affiliates"
            className="font-medium text-muted no-underline hover:text-foreground"
          >
            {tc('affiliates')}
          </a>
          <a href="/help" className="font-medium text-muted no-underline hover:text-foreground">
            {tc('help')}
          </a>
          <a href="#features" className="font-medium text-muted no-underline hover:text-foreground">
            Features
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-12">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-primary">
              {pricingVariant === 'highlight_pro' ? tm('taglinePro') : tm('tagline')}
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              {pricingVariant === 'highlight_pro' ? tm('heroTitlePro') : tm('heroTitle')}
            </h1>
            <p className="mt-5 text-lg text-muted">
              {pricingVariant === 'highlight_pro' ? tm('heroSubtitlePro') : tm('heroSubtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#download" className={linkButtonPrimary}>
                {ctaVariant === 'trial' ? 'Start free trial' : tm('downloadMac')}
              </a>
              <a href="#features" className={linkButtonSecondary}>
                {tm('seeHow')}
              </a>
            </div>
          </div>

          <div
            className="mt-14 overflow-hidden rounded-2xl border border-border shadow-lg"
            style={{ background: 'var(--sg-gradient-brand)' }}
          >
            <div className="flex aspect-video items-center justify-center p-8 text-primary-foreground">
              <p className="text-center text-lg font-medium">Capture → Beautify → Share</p>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border bg-surface py-20">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title}>
                <h2 className="text-base font-semibold">{feature.title}</h2>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="download" className="border-t border-border py-20">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <h2 className="text-2xl font-bold">{tm('readyTitle')}</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">{tm('readySubtitle')}</p>
            <div className="mt-8 flex justify-center">
              <a href="https://snapglow.app/download" className={linkButtonPrimary}>
                Download SnapGlow
              </a>
            </div>
            <div className="mt-6">
              <Button variant="ghost" size="sm" type="button">
                Windows - coming soon
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        SnapGlow - screenshots that shine.
      </footer>
    </div>
  );
}
