import type { AnnotationOp } from '@xcreener/collab-core';
import type { Annotation } from '@/modules/editor/annotations/types';
import { cloneAnnotations } from '@/modules/editor/annotations/utils';
import { getPresetById } from '@/modules/editor/engine/presets';
import { useEditorStore } from '@/modules/editor/store';
import { collabClient } from './client';

let applyingRemote = false;

export function isApplyingRemoteAnnotation(): boolean {
  return applyingRemote;
}

export function applyRemoteAnnotationOp(op: AnnotationOp): void {
  applyingRemote = true;
  const store = useEditorStore.getState();

  switch (op.op) {
    case 'add':
      if (op.annotation) {
        store.addAnnotation(op.annotation);
      }
      break;
    case 'update':
      if (op.annotationId && op.patch) {
        store.updateAnnotation(op.annotationId, op.patch);
      }
      break;
    case 'remove':
      if (op.annotationId) {
        store.removeAnnotation(op.annotationId);
      }
      break;
    case 'batch':
      if (op.annotations) {
        store.setAnnotations(op.annotations);
      }
      break;
  }

  applyingRemote = false;
}

export function emitAnnotationOps(prev: Annotation[], next: Annotation[]): void {
  if (applyingRemote) {
    return;
  }

  const prevById = new Map(prev.map((item) => [item.id, item]));
  const nextById = new Map(next.map((item) => [item.id, item]));

  for (const [id, annotation] of nextById) {
    if (!prevById.has(id)) {
      collabClient.sendRaw({ type: 'annotation:op', op: { op: 'add', annotation } });
    }
  }

  for (const [id, annotation] of nextById) {
    const previous = prevById.get(id);
    if (previous && JSON.stringify(previous) !== JSON.stringify(annotation)) {
      collabClient.sendRaw({
        type: 'annotation:op',
        op: { op: 'update', annotationId: id, patch: annotation },
      });
    }
  }

  for (const [id] of prevById) {
    if (!nextById.has(id)) {
      collabClient.sendRaw({
        type: 'annotation:op',
        op: { op: 'remove', annotationId: id },
      });
    }
  }
}

export function snapshotAnnotations(): Annotation[] {
  return cloneAnnotations(useEditorStore.getState().annotations);
}

export function buildDocumentStateFromEditor() {
  const state = useEditorStore.getState();
  const frame = state.selectedPresetId
    ? getPresetById(state.selectedPresetId, state.customPresets)
    : null;

  return {
    screenshotWidth: state.screenshot?.width ?? 0,
    screenshotHeight: state.screenshot?.height ?? 0,
    background: state.background,
    padding: state.padding,
    borderRadius: state.borderRadius,
    shadow: state.shadow,
    frame,
    transform: state.transform,
    annotations: cloneAnnotations(state.annotations),
  };
}
