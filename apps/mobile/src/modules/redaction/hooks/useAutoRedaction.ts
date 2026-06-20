import { useEffect, useRef } from 'react';

import { useEditorStore } from '@/modules/editor/store';

import { getAutoRedactionEnabled } from '../settings';
import { useRedactionStore } from '../store';
import { useRedactionScan } from './useRedactionScan';

export function useAutoRedaction(): void {
  const screenshot = useEditorStore((state) => state.screenshot);
  const { scan, maskAll } = useRedactionScan();
  const pendingRef = useRef(false);
  const lastUriRef = useRef<string | null>(null);

  useEffect(() => {
    if (screenshot?.uri !== lastUriRef.current) {
      lastUriRef.current = screenshot?.uri ?? null;
      useRedactionStore.getState().clear();
      pendingRef.current = false;
    }
  }, [screenshot?.uri]);

  useEffect(() => {
    if (!screenshot || pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    void (async () => {
      try {
        const enabled = await getAutoRedactionEnabled();
        if (!enabled) {
          return;
        }
        await scan();
        maskAll(true);
      } finally {
        pendingRef.current = false;
      }
    })();
  }, [maskAll, scan, screenshot]);
}
