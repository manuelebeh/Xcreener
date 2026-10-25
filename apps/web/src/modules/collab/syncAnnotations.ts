import type { AnnotationOp } from '@xcreener/collab-core';
import type { Annotation } from '@xcreener/editor-core';
import { collabClient } from './client';
import { useCollabStore } from './store';

let applyingRemote = false;

export function applyRemoteAnnotationOp(op: AnnotationOp): void {
  applyingRemote = true;
  const annotations = [...useCollabStore.getState().annotations];

  switch (op.op) {
    case 'add':
      if (op.annotation) {
        useCollabStore
          .getState()
          .setAnnotations([
            ...annotations.filter((a) => a.id !== op.annotation?.id),
            op.annotation,
          ]);
      }
      break;
    case 'update':
      if (op.annotationId && op.patch) {
        useCollabStore
          .getState()
          .setAnnotations(
            annotations.map((item) =>
              item.id === op.annotationId ? ({ ...item, ...op.patch } as Annotation) : item
            )
          );
      }
      break;
    case 'remove':
      if (op.annotationId) {
        useCollabStore
          .getState()
          .setAnnotations(annotations.filter((item) => item.id !== op.annotationId));
      }
      break;
    case 'batch':
      if (op.annotations) {
        useCollabStore.getState().setAnnotations(op.annotations);
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

  for (const [, annotation] of nextById) {
    if (!prevById.has(annotation.id)) {
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
      collabClient.sendRaw({ type: 'annotation:op', op: { op: 'remove', annotationId: id } });
    }
  }
}
