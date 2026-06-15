import { Navigate, Route, Routes } from 'react-router-dom';
import { Canvas } from '@/modules/editor';
import { SettingsPanel } from '@/modules/settings';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main style={{ padding: 16, minHeight: '100vh', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 20 }}>SnapGlow</h1>
              <p style={{ margin: '4px 0 0', opacity: 0.7 }}>Capture · Beautify · Share</p>
            </header>
            <Canvas />
          </main>
        }
      />
      <Route path="/settings" element={<SettingsPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
