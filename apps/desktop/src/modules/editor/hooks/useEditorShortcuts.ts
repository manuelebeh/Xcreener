import { useEffect } from 'react';
import { captureExportCompleted } from '@/integrations/posthog/events';
import { useExportRender } from '@/modules/export/hooks/useExportRender';
import { useExportStore } from '@/modules/export/store';
import { copyExportToClipboard } from '@/modules/export/utils/copyExport';
import { useEditorStore } from '../store';

export function useEditorShortcuts(): void {
  const { exportImage } = useExportRender();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const isMeta = event.metaKey || event.ctrlKey;
      const state = useEditorStore.getState();

      if (isMeta && event.key.toLowerCase() === 'c' && !event.shiftKey) {
        if (!state.screenshot || useExportStore.getState().isExporting) {
          return;
        }
        event.preventDefault();
        void (async () => {
          useExportStore.getState().setIsExporting(true);
          try {
            const { size, durationMs } = await copyExportToClipboard(exportImage, 'png');
            captureExportCompleted({ format: 'png', file_size: size, duration_ms: durationMs });
            useExportStore.getState().setLastMessage('Copied to clipboard');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            useExportStore.getState().setLastMessage(message);
          } finally {
            useExportStore.getState().setIsExporting(false);
          }
        })();
        return;
      }

      if (isMeta && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        state.redo();
        return;
      }

      if (isMeta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        state.undo();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!state.selectedAnnotationId) {
          return;
        }
        event.preventDefault();
        state.pushHistory();
        state.removeAnnotation(state.selectedAnnotationId);
        return;
      }

      if (event.key === 'Escape') {
        state.selectAnnotation(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportImage]);
}
