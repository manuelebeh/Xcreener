import type { AnnotationOp, CollabDocumentState } from '@snapglow/collab-core';
import type { Annotation } from '@snapglow/editor-core';

export function applyAnnotationOp(
  state: CollabDocumentState,
  op: AnnotationOp
): CollabDocumentState {
  switch (op.op) {
    case 'add': {
      if (!op.annotation) {
        return state;
      }
      const filtered = state.annotations.filter((item) => item.id !== op.annotation?.id);
      return { ...state, annotations: [...filtered, op.annotation] };
    }
    case 'update': {
      if (!op.annotationId || !op.patch) {
        return state;
      }
      return {
        ...state,
        annotations: state.annotations.map((item) =>
          item.id === op.annotationId ? ({ ...item, ...op.patch } as Annotation) : item
        ),
      };
    }
    case 'remove': {
      if (!op.annotationId) {
        return state;
      }
      return {
        ...state,
        annotations: state.annotations.filter((item) => item.id !== op.annotationId),
      };
    }
    case 'batch': {
      if (!op.annotations) {
        return state;
      }
      return { ...state, annotations: op.annotations };
    }
    default:
      return state;
  }
}
