import type { SkImage } from '@shopify/react-native-skia';
import { computeLayout, fitGpuTextureSize } from '@snapglow/editor-core';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { PixelRatio, View } from 'react-native';
import {
  BeautifyCanvas,
  type BeautifyCanvasHandle,
} from '@/modules/editor/components/BeautifyCanvas';
import type { MobileRenderInput } from '@/modules/editor/hooks/useMobileRenderInput';

export interface ExportCanvasHandle {
  makeSnapshot: () => Promise<SkImage | null>;
}

interface ExportCanvasProps {
  input: MobileRenderInput;
}

export const ExportCanvas = forwardRef<ExportCanvasHandle, ExportCanvasProps>(function ExportCanvas(
  { input },
  ref
) {
  const canvasRef = useRef<BeautifyCanvasHandle>(null);
  const layout = computeLayout(input);
  const exportSize = fitGpuTextureSize(
    layout.canvasWidth,
    layout.canvasHeight,
    undefined,
    PixelRatio.get()
  );

  useImperativeHandle(ref, () => ({
    makeSnapshot: async () => canvasRef.current?.makeSnapshot() ?? null,
  }));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        opacity: 0,
        left: -9999,
        width: exportSize.width,
        height: exportSize.height,
      }}
    >
      <BeautifyCanvas
        ref={canvasRef}
        exportMode
        input={input}
        imageUri={input.screenshot.uri}
        containerWidth={exportSize.width}
        containerHeight={exportSize.height}
      />
    </View>
  );
});
