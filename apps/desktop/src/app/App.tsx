import { BrowserRouter, Link } from 'react-router-dom';
import { useCaptureStore } from '@/modules/capture/store';
import { useTrayNavigation } from './hooks/useTrayNavigation';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import '@/styles/global.css';

function AppShell() {
  useTrayNavigation();
  const isCapturing = useCaptureStore((s) => s.isCapturing);

  return (
    <>
      {isCapturing ? (
        <div
          data-testid="capture-banner"
          className="bg-primary px-4 py-2 text-center text-sm text-primary-foreground"
        >
          Capture shortcut triggered (stub)
        </div>
      ) : null}
      <nav className="flex gap-3 border-b border-border px-4 py-2 text-sm">
        <Link to="/">Editor</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <AppRoutes />
    </>
  );
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProviders>
  );
}
