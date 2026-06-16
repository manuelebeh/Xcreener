import { useEffect } from 'react';
import { listCustomPresets, storedToFramePreset } from '@/db/presets';
import { isTauriRuntime } from '@/shared/lib/tauri';
import { useEditorStore } from '../store';

export function useCustomPresetsLoader(): void {
  const setCustomPresets = useEditorStore((s) => s.setCustomPresets);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let cancelled = false;

    listCustomPresets()
      .then((stored) => {
        if (!cancelled) {
          setCustomPresets(stored.map(storedToFramePreset));
        }
      })
      .catch((error) => {
        console.error('[SnapGlow] Failed to load custom presets', error);
      });

    return () => {
      cancelled = true;
    };
  }, [setCustomPresets]);
}
