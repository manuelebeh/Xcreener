import { computeLayout, fitPreviewSize } from '@xcreener/editor-core';
import { mapRegionToLayout } from '@xcreener/redaction-core';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMobileRenderInput } from '@/modules/editor/hooks/useMobileRenderInput';

import { useRedactionScan } from '../hooks/useRedactionScan';
import { useRedactionStore } from '../store';
import { detectionColor } from '../types';

interface RedactionOverlayProps {
  containerWidth: number;
  containerHeight: number;
}

export function RedactionOverlay({ containerWidth, containerHeight }: RedactionOverlayProps) {
  const renderInput = useMobileRenderInput();
  const detections = useRedactionStore((state) => state.detections);
  const { maskOne } = useRedactionScan();

  if (!renderInput || detections.length === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return null;
  }

  const layout = computeLayout(renderInput);
  const displaySize = fitPreviewSize(
    layout.canvasWidth,
    layout.canvasHeight,
    containerWidth,
    containerHeight
  );
  const displayScale = layout.canvasWidth > 0 ? displaySize.width / layout.canvasWidth : 1;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {detections.map((detection) => {
        const rect = mapRegionToLayout(detection, renderInput);
        return (
          <Pressable
            key={detection.id}
            accessibilityLabel={`Mask ${detection.kind}`}
            onPress={() => maskOne(detection.id)}
            style={{
              position: 'absolute',
              left: rect.x * displayScale,
              top: rect.y * displayScale,
              width: rect.width * displayScale,
              height: rect.height * displayScale,
              backgroundColor: detectionColor(detection.kind),
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.7)',
            }}
          />
        );
      })}
    </View>
  );
}
