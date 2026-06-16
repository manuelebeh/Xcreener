import { useCallback, useLayoutEffect, useRef } from 'react';
import { useEditorStore } from '../store';

interface TextEditorOverlayProps {
  request: {
    annotationId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  displayScale: number;
  onClose: () => void;
}

export function TextEditorOverlay({ request, displayScale, onClose }: TextEditorOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateAnnotation = useEditorStore((s) => s.updateAnnotation);

  const finishEditing = useCallback(() => {
    if (!request) {
      return;
    }

    const value = textareaRef.current?.value.trim();
    if (value) {
      updateAnnotation(request.annotationId, { text: value });
    } else {
      useEditorStore.getState().removeAnnotation(request.annotationId);
    }
    onClose();
  }, [onClose, request, updateAnnotation]);

  useLayoutEffect(() => {
    if (!request) {
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const annotation = useEditorStore
      .getState()
      .annotations.find((item) => item.id === request.annotationId);

    if (annotation?.type === 'text') {
      textarea.value = annotation.text;
      textarea.style.fontFamily = annotation.fontFamily;
      textarea.style.fontSize = `${annotation.fontSize * displayScale}px`;
      textarea.style.color = annotation.color;
      textarea.style.backgroundColor = annotation.backgroundColor ?? 'transparent';
    }

    const focusFrame = requestAnimationFrame(() => {
      textarea.focus();
      textarea.select();
    });

    return () => {
      cancelAnimationFrame(focusFrame);
    };
  }, [displayScale, request]);

  if (!request) {
    return null;
  }

  return (
    <textarea
      ref={textareaRef}
      className="pointer-events-auto absolute z-20 resize-none border border-primary bg-background/90 p-1 outline-none"
      style={{
        left: request.x * displayScale,
        top: request.y * displayScale,
        minWidth: Math.max(80, request.width * displayScale),
        minHeight: Math.max(28, request.height * displayScale),
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onBlur={finishEditing}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          finishEditing();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    />
  );
}
