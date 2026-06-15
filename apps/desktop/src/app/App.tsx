import { BrowserRouter, Link } from 'react-router-dom';
import { AppProviders } from './providers';
import { AppRoutes } from './routes';
import '@/styles/global.css';

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <nav
          style={{
            display: 'flex',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            fontSize: 14,
          }}
        >
          <Link to="/">Editor</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
