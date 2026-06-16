import { Button } from '@snapglow/ui';
import { createFileRoute } from '@tanstack/react-router';

const features = [
  {
    title: 'Capture instantly',
    description:
      'Global shortcuts from menu bar or system tray. Any screen, any window, in one keystroke.',
  },
  {
    title: 'Beautify in seconds',
    description: 'Padding, backgrounds, and polish — no design skills required.',
  },
  {
    title: 'Share with confidence',
    description: 'Export locally. Your screenshots never leave your machine unless you choose.',
  },
] as const;

const linkButtonPrimary =
  'inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground no-underline transition-opacity hover:opacity-90';

const linkButtonSecondary =
  'inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-6 text-base font-medium text-foreground no-underline transition-opacity hover:opacity-80';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'SnapGlow — Screenshots that shine' },
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold tracking-tight">SnapGlow</span>
        <a
          href="#features"
          className="text-sm font-medium text-muted no-underline hover:text-foreground"
        >
          Features
        </a>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-12">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium text-primary">Privacy-first screenshot app</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Screenshots that shine.
            </h1>
            <p className="mt-5 text-lg text-muted">
              Transform any capture into a polished visual in under 5 seconds — without sending your
              data to the cloud.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#download" className={linkButtonPrimary}>
                Download for macOS
              </a>
              <a href="#features" className={linkButtonSecondary}>
                See how it works
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
            <h2 className="text-2xl font-bold">Ready to glow?</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Desktop app for macOS and Windows. Local processing, no account required.
            </p>
            <div className="mt-8 flex justify-center">
              <a href="https://snapglow.app/download" className={linkButtonPrimary}>
                Download SnapGlow
              </a>
            </div>
            <div className="mt-6">
              <Button variant="ghost" size="sm" type="button">
                Windows — coming soon
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        SnapGlow — screenshots that shine.
      </footer>
    </div>
  );
}
