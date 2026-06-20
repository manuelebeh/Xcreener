import {
  BackdropFilter,
  Blur,
  Canvas,
  Circle,
  Fill,
  Group,
  Image,
  LinearGradient,
  matchFont,
  Oval,
  Rect,
  RoundedRect,
  type SkImage,
  Text as SkiaText,
  useCanvasRef,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import {
  type Annotation,
  computeLayout,
  fitGpuTextureSize,
  fitPreviewSize,
  getGradientPreset,
  getResizeHandles,
  type RenderInput,
} from '@snapglow/editor-core';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { PixelRatio, View } from 'react-native';

export interface BeautifyCanvasHandle {
  makeSnapshot: () => Promise<SkImage | null>;
}

interface BeautifyCanvasProps {
  input: RenderInput;
  imageUri: string;
  containerWidth: number;
  containerHeight: number;
  exportMode?: boolean;
}

function gradientVectors(angle: number, width: number, height: number) {
  const radians = (angle * Math.PI) / 180;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const length = Math.sqrt(width * width + height * height) / 2;
  return {
    start: vec(halfWidth - Math.cos(radians) * length, halfHeight - Math.sin(radians) * length),
    end: vec(halfWidth + Math.cos(radians) * length, halfHeight + Math.sin(radians) * length),
  };
}

function hexWithOpacity(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function AnnotationLayer({ annotation }: { annotation: Annotation }) {
  switch (annotation.type) {
    case 'highlight':
      return (
        <Rect
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          color={annotation.color}
          opacity={annotation.opacity}
        />
      );
    case 'rect':
      return (
        <Group>
          {annotation.fill ? (
            <Rect
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              color={annotation.fill}
            />
          ) : null}
          <Rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            color={annotation.stroke}
            style="stroke"
            strokeWidth={annotation.strokeWidth}
          />
        </Group>
      );
    case 'ellipse':
      return (
        <Group>
          {annotation.fill ? (
            <Oval
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              color={annotation.fill}
            />
          ) : null}
          <Oval
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            color={annotation.stroke}
            style="stroke"
            strokeWidth={annotation.strokeWidth}
          />
        </Group>
      );
    case 'text': {
      const font = matchFont({ fontFamily: 'System', fontSize: annotation.fontSize });
      return (
        <Group>
          {annotation.backgroundColor ? (
            <Rect
              x={annotation.x - 4}
              y={annotation.y - 4}
              width={Math.max(40, annotation.text.length * annotation.fontSize * 0.55) + 8}
              height={annotation.fontSize * 1.4 + 8}
              color={annotation.backgroundColor}
            />
          ) : null}
          <SkiaText
            x={annotation.x}
            y={annotation.y + annotation.fontSize}
            text={annotation.text}
            font={font}
            color={annotation.color}
          />
        </Group>
      );
    }
    default:
      return null;
  }
}

function SelectionHandles({ annotation }: { annotation: Annotation }) {
  const handles = getResizeHandles(annotation);
  return (
    <Group>
      {handles.map((handle) => (
        <Circle key={handle.id} cx={handle.x} cy={handle.y} r={6} color="#2563eb" />
      ))}
    </Group>
  );
}

function SceneContent({ input, image }: { input: RenderInput; image: SkImage }) {
  const layout = useMemo(() => computeLayout(input), [input]);
  const { canvasWidth, canvasHeight, screenshot } = layout;
  const radius = Math.min(input.borderRadius, screenshot.width / 2, screenshot.height / 2);

  const blurAnnotations = input.annotations.filter(
    (annotation): annotation is Extract<Annotation, { type: 'blur' }> => annotation.type === 'blur'
  );
  const vectorAnnotations = input.annotations.filter((annotation) => annotation.type !== 'blur');
  const selected = input.annotations.find(
    (annotation) => annotation.id === input.selectedAnnotationId
  );

  const backgroundElement = useMemo(() => {
    if (input.background.type === 'solid') {
      return (
        <Rect
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          color={input.background.color}
        />
      );
    }

    if (input.background.type !== 'gradient') {
      return <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} color="#1a1a1a" />;
    }

    const preset = getGradientPreset(input.background.presetId);
    const vectors = gradientVectors(preset.angle, canvasWidth, canvasHeight);
    return (
      <Rect x={0} y={0} width={canvasWidth} height={canvasHeight}>
        <LinearGradient
          start={vectors.start}
          end={vectors.end}
          colors={preset.stops.map((stop) => stop.color)}
          positions={preset.stops.map((stop) => stop.offset)}
        />
      </Rect>
    );
  }, [canvasHeight, canvasWidth, input.background]);

  return (
    <Group>
      {backgroundElement}

      {input.shadow.opacity > 0 && input.shadow.blur > 0 ? (
        <RoundedRect
          x={screenshot.x + input.shadow.offsetX}
          y={screenshot.y + input.shadow.offsetY}
          width={screenshot.width}
          height={screenshot.height}
          r={radius}
          color={hexWithOpacity(input.shadow.color, input.shadow.opacity)}
        >
          <Blur blur={input.shadow.blur} />
        </RoundedRect>
      ) : null}

      <Group
        clip={{
          rect: {
            x: screenshot.x,
            y: screenshot.y,
            width: screenshot.width,
            height: screenshot.height,
          },
          rx: radius,
          ry: radius,
        }}
      >
        <Image
          image={image}
          x={screenshot.x}
          y={screenshot.y}
          width={screenshot.width}
          height={screenshot.height}
          fit="fill"
        />
      </Group>

      {blurAnnotations.map((annotation) => (
        <BackdropFilter
          key={annotation.id}
          filter={
            annotation.mode === 'gaussian' ? (
              <Blur blur={Math.max(1, annotation.intensity * 0.45)} />
            ) : (
              <Blur blur={Math.max(1, annotation.intensity)} />
            )
          }
          clip={{
            rect: {
              x: annotation.x,
              y: annotation.y,
              width: annotation.width,
              height: annotation.height,
            },
            rx: 0,
            ry: 0,
          }}
        >
          <Fill color="transparent" />
        </BackdropFilter>
      ))}

      {vectorAnnotations.map((annotation) => (
        <AnnotationLayer key={annotation.id} annotation={annotation} />
      ))}

      {selected ? <SelectionHandles annotation={selected} /> : null}
    </Group>
  );
}

export const BeautifyCanvas = forwardRef<BeautifyCanvasHandle, BeautifyCanvasProps>(
  function BeautifyCanvas(
    { input, imageUri, containerWidth, containerHeight, exportMode = false },
    ref
  ) {
    const canvasRef = useCanvasRef();
    const image = useImage(imageUri);
    const layout = useMemo(() => computeLayout(input), [input]);

    const pixelRatio = PixelRatio.get();

    const displaySize = useMemo(() => {
      if (exportMode) {
        return fitGpuTextureSize(
          layout.canvasWidth,
          layout.canvasHeight,
          undefined,
          pixelRatio
        );
      }
      return fitPreviewSize(
        layout.canvasWidth,
        layout.canvasHeight,
        containerWidth,
        containerHeight
      );
    }, [
      containerHeight,
      containerWidth,
      exportMode,
      layout.canvasHeight,
      layout.canvasWidth,
      pixelRatio,
    ]);

    const displayScale = layout.canvasWidth > 0 ? displaySize.width / layout.canvasWidth : 1;

    useImperativeHandle(ref, () => ({
      makeSnapshot: async () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          return null;
        }

        canvas.redraw();
        return (await canvas.makeImageSnapshotAsync()) ?? null;
      },
    }));

    if (!image || displaySize.width <= 0 || displaySize.height <= 0) {
      return <View style={{ flex: 1 }} />;
    }

    return (
      <Canvas ref={canvasRef} style={{ width: displaySize.width, height: displaySize.height }}>
        <Group transform={displayScale !== 1 ? [{ scale: displayScale }] : undefined}>
          <SceneContent input={input} image={image} />
        </Group>
      </Canvas>
    );
  }
);
