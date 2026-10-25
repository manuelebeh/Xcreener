import { fitPreviewSize } from '@xcreener/editor-core';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { RedactionOverlay } from '@/modules/redaction';

import { useAnnotationInteraction } from '../hooks/useAnnotationInteraction';
import { useLayoutDimensions } from '../hooks/useLayoutDimensions';
import { useMobileRenderInput } from '../hooks/useMobileRenderInput';
import { BeautifyCanvas, type BeautifyCanvasHandle } from './BeautifyCanvas';
import { TextEditorOverlay, type TextEditRequest } from './TextEditorOverlay';

interface EditorCanvasProps {
  canvasRef?: React.RefObject<BeautifyCanvasHandle | null>;
}

export function EditorCanvas({ canvasRef }: EditorCanvasProps) {
  const renderInput = useMobileRenderInput();
  const layout = useLayoutDimensions(renderInput);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [textEditRequest, setTextEditRequest] = useState<TextEditRequest | null>(null);
  const internalRef = useRef<BeautifyCanvasHandle>(null);
  const ref = canvasRef ?? internalRef;

  const displaySize = useMemo(() => {
    if (!layout || containerSize.width <= 0 || containerSize.height <= 0) {
      return { width: 0, height: 0 };
    }
    return fitPreviewSize(
      layout.canvasWidth,
      layout.canvasHeight,
      containerSize.width,
      containerSize.height
    );
  }, [containerSize.height, containerSize.width, layout]);

  const panHandlers = useAnnotationInteraction({
    layoutWidth: layout?.canvasWidth ?? 0,
    displayWidth: displaySize.width,
    onTextEdit: setTextEditRequest,
  });

  if (!renderInput || !layout) {
    return null;
  }

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
    >
      <View
        style={{ width: displaySize.width, height: displaySize.height, position: 'relative' }}
        {...panHandlers}
      >
        <BeautifyCanvas
          ref={ref}
          input={renderInput}
          imageUri={renderInput.screenshot.uri}
          containerWidth={displaySize.width}
          containerHeight={displaySize.height}
        />
        <RedactionOverlay containerWidth={displaySize.width} containerHeight={displaySize.height} />
      </View>
      <TextEditorOverlay request={textEditRequest} onClose={() => setTextEditRequest(null)} />
    </View>
  );
}
