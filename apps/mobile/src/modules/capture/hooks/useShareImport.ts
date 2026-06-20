import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';

import { useCaptureStore } from '../store';

function isImageFile(mimeType: string | undefined): boolean {
  return mimeType?.startsWith('image/') ?? false;
}

export function useShareImport() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const router = useRouter();
  const setImportedImage = useCaptureStore((state) => state.setImportedImage);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasShareIntent) return;

    const file = shareIntent.files?.find((entry) => isImageFile(entry.mimeType));
    if (!file?.path) return;

    if (handledRef.current === file.path) return;
    handledRef.current = file.path;

    setImportedImage({
      uri: file.path,
      mimeType: file.mimeType ?? 'image/jpeg',
      fileName: file.fileName,
      width: file.width ?? undefined,
      height: file.height ?? undefined,
    });

    resetShareIntent();
    router.push('/import');
  }, [hasShareIntent, shareIntent, resetShareIntent, setImportedImage, router]);
}
