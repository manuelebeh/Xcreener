import { BrowserRouter, Link } from 'react-router-dom';
import { useCaptureSession } from '@/modules/capture/hooks/useCaptureSession';
import { useTrayNavigation } from './hooks/useTrayNavigation';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import '@/styles/global.css';

function AppShell() {
  useTrayNavigation();
  useCaptureSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex gap-3 border-b border-border px-4 py-2 text-sm">
        <Link to="/">Editor</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <AppRoutes />
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
