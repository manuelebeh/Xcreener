import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCapture } from '@/db/captures';
import { useEditorStore } from '@/modules/editor/store';
import { decodePngBytesToBitmap } from '@/shared/utils/image';
import { openPath } from '@/tauri/commands';
import { readCaptureBytes } from '../utils/captureFiles';

export function useOpenCapture() {
  const navigate = useNavigate();
  const setScreenshot = useEditorStore((s) => s.setScreenshot);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openCapture = useCallback(
    async (id: number) => {
      setOpeningId(id);
      setError(null);
      try {
        const capture = await getCapture(id);
        if (!capture) {
          throw new Error('Capture not found');
        }

        if (capture.format === 'gif' || capture.format === 'mp4') {
          await openPath(capture.filepath);
          return;
        }

        const bytes = await readCaptureBytes(capture.filepath);
        const bitmap = await decodePngBytesToBitmap(bytes);
        setScreenshot(bitmap);
        navigate('/', { replace: true });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        setError(message);
      } finally {
        setOpeningId(null);
      }
    },
    [navigate, setScreenshot]
  );

  return { openCapture, openingId, error };
}
