import { Navigate, Route, Routes } from 'react-router-dom';
import { EditorView } from '@/modules/editor';
import { HistoryView } from '@/modules/history';
import { SettingsPanel } from '@/modules/settings';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <main className="box-border min-h-0 w-full flex-1 p-4">
            <EditorView />
          </main>
        }
      />
      <Route
        path="/settings"
        element={
          <main className="box-border min-h-0 w-full flex-1 p-4">
            <SettingsPanel />
          </main>
        }
      />
      <Route
        path="/history"
        element={
          <main className="box-border min-h-0 w-full flex-1 p-4">
            <HistoryView />
          </main>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
