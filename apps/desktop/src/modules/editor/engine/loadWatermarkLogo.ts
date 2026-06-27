import { convertFileSrc } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';

export async function loadWatermarkLogo(path: string | null | undefined): Promise<CanvasImageSource | null> {
  if (!path) {
    return null;
  }

  try {
    const bytes = await readFile(path);
    const blob = new Blob([bytes], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    return bitmap;
  } catch {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = convertFileSrc(path);
    });
  }
}
