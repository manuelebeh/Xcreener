import type { WatermarkConfig } from '@snapglow/editor-core';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { AppSettings } from '@/shared/types/settings';

export function watermarkFromSettings(settings: Pick<
  AppSettings,
  | 'watermarkEnabled'
  | 'watermarkDisplayName'
  | 'watermarkUrl'
  | 'watermarkLogoPath'
  | 'watermarkPosition'
  | 'watermarkOpacity'
>): WatermarkConfig {
  return {
    enabled: settings.watermarkEnabled,
    logoPath: settings.watermarkLogoPath || null,
    displayName: settings.watermarkDisplayName || null,
    url: settings.watermarkUrl || null,
    position: settings.watermarkPosition,
    opacity: settings.watermarkOpacity,
  };
}

export async function loadWatermarkLogoImage(
  logoPath: string | null | undefined
): Promise<HTMLImageElement | null> {
  if (!logoPath?.trim()) {
    return null;
  }

  const image = new Image();
  image.src = convertFileSrc(logoPath);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load watermark logo'));
  });
  return image;
}
