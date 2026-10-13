import { BrowserRouter } from 'react-router-dom';
import { registerE2EBridge } from '@/e2e/bridge';
import { CaptureErrorBanner } from '@/modules/capture/components/CaptureErrorBanner';
import { CaptureProgressBanner } from '@/modules/capture/components/CaptureProgressBanner';
import { useCaptureSession } from '@/modules/capture/hooks/useCaptureSession';
import { useCloudAuthListener } from '@/modules/cloud/hooks/useCloudAuthListener';
import { useIntegrationsListener } from '@/modules/integrations/hooks/useIntegrationsListener';
import { useReferralDeepLink } from '@/modules/licensing/hooks/useReferralDeepLink';
import { AppTopNav } from './components/AppTopNav';
import { useTrayNavigation } from './hooks/useTrayNavigation';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';

registerE2EBridge();

function AppShell() {
  useTrayNavigation();
  useCaptureSession();
  useCloudAuthListener();
  useReferralDeepLink();
  useIntegrationsListener();

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <CaptureErrorBanner />
      <CaptureProgressBanner />
      <AppTopNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppRoutes />
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </BrowserRouter>
  );
}
