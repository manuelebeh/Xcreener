import { useRef, useState } from 'react';
import { View } from 'react-native';

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

  const panHandlers = useAnnotationInteraction({
    layoutWidth: layout?.canvasWidth ?? 0,
    displayWidth: containerSize.width,
    onTextEdit: setTextEditRequest,
  });

  if (!renderInput) {
    return null;
  }

  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setContainerSize({ width, height });
      }}
      {...panHandlers}
    >
      <BeautifyCanvas
        ref={ref}
        input={renderInput}
        imageUri={renderInput.screenshot.uri}
        containerWidth={containerSize.width}
        containerHeight={containerSize.height}
      />
      <TextEditorOverlay request={textEditRequest} onClose={() => setTextEditRequest(null)} />
    </View>
  );
}
