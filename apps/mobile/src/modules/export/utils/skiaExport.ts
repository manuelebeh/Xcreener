import { ImageFormat, type SkImage } from '@shopify/react-native-skia';
import {
  documentDirectory,
  EncodingType,
  getInfoAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import type { MobileRenderInput } from '@/modules/editor/hooks/useMobileRenderInput';

const MIN_EXPORT_BYTES = 64;

function encodeSnapshotBase64(snapshot: SkImage, format: 'png' | 'jpg'): string | null {
  const raster = snapshot.makeNonTextureImage() ?? snapshot;

  try {
    return format === 'jpg'
      ? raster.encodeToBase64(ImageFormat.JPEG, 90)
      : raster.encodeToBase64(ImageFormat.PNG);
  } catch {
    return null;
  }
}

export async function encodeSnapshotToFile(
  snapshot: SkImage | null | undefined,
  format: 'png' | 'jpg'
): Promise<string | null> {
  if (!snapshot || !documentDirectory) {
    return null;
  }

  const base64 = encodeSnapshotBase64(snapshot, format);
  if (!base64) {
    return null;
  }

  const extension = format === 'jpg' ? 'jpg' : 'png';
  const fileUri = `${documentDirectory}snapglow-export-${Date.now()}.${extension}`;

  await writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  const info = await getInfoAsync(fileUri);
  if (!info.exists || info.size < MIN_EXPORT_BYTES) {
    return null;
  }

  return fileUri;
}

export function buildExportRenderInput(input: MobileRenderInput | null): MobileRenderInput | null {
  if (!input) {
    return null;
  }

  return {
    ...input,
    selectedAnnotationId: null,
  };
}
