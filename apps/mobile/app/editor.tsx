import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useCaptureStore } from '@/modules/capture';
import { EditorView, useEditorStore } from '@/modules/editor';

export default function EditorScreen() {
  const router = useRouter();
  const importedImage = useCaptureStore((state) => state.importedImage);
  const setScreenshot = useEditorStore((state) => state.setScreenshot);

  useEffect(() => {
    if (!importedImage) {
      router.replace('/import');
      return;
    }

    setScreenshot({
      uri: importedImage.uri,
      width: importedImage.width ?? 800,
      height: importedImage.height ?? 600,
    });
  }, [importedImage, router, setScreenshot]);

  return <EditorView />;
}
