import { Navigate, Route, Routes } from 'react-router-dom';
import { BeautifyPanel, Canvas } from '@/modules/editor';
import { SettingsPanel } from '@/modules/settings';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="box-border min-h-screen p-4">
            <header className="mb-4">
              <h1 className="m-0 text-xl font-semibold">SnapGlow</h1>
              <p className="mt-1 text-sm text-muted">Capture · Beautify · Share</p>
            </header>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <Canvas />
              <BeautifyPanel />
            </div>
          </main>
        }
      />
      <Route path="/settings" element={<SettingsPanel />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
