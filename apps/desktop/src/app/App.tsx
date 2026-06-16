import { BrowserRouter, Link } from 'react-router-dom';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import '@/styles/global.css';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <nav className="flex gap-3 border-b border-border px-4 py-2 text-sm">
          <Link to="/">Editor</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
