import { deleteCaptureRow } from '@/db/captures';
import { deleteCaptureFiles } from './captureFiles';

export async function removeCapture(id: number): Promise<boolean> {
  const deleted = await deleteCaptureRow(id);
  if (!deleted) {
    return false;
  }

  await deleteCaptureFiles(deleted.filepath, deleted.thumbnail);
  return true;
}
