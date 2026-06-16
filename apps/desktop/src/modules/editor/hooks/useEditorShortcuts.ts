import { useEffect } from 'react';
import { useEditorStore } from '../store';

export function useEditorShortcuts(): void {
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
  }, []);
}
