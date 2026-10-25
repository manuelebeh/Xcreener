import { MAX_COLLAB_ANNOTATIONS } from '@xcreener/api-core';
import type { AnnotationOp, CollabDocumentState } from '@xcreener/collab-core';
import type { Annotation } from '@xcreener/editor-core';
import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

const ANNOTATION_OP_TYPES = new Set(['add', 'update', 'remove', 'batch']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAnnotationLike(value: unknown): value is Annotation {
  return (
    isPlainObject(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    value.id.length <= 128 &&
    typeof value.type === 'string'
  );
}

/** Shape check for ops received over the WebSocket before they are persisted and broadcast. */
export function isValidAnnotationOp(value: unknown): value is AnnotationOp {
  if (!isPlainObject(value) || typeof value.op !== 'string' || !ANNOTATION_OP_TYPES.has(value.op)) {
    return false;
  }
  switch (value.op) {
    case 'add':
      return isAnnotationLike(value.annotation);
    case 'update':
      return (
        typeof value.annotationId === 'string' &&
        isPlainObject(value.patch) &&
        (!('id' in value.patch) || value.patch.id === value.annotationId)
      );
    case 'remove':
      return typeof value.annotationId === 'string';
    case 'batch':
      return (
        Array.isArray(value.annotations) &&
        value.annotations.length <= MAX_COLLAB_ANNOTATIONS &&
        value.annotations.every(isAnnotationLike)
      );
    default:
      return false;
  }
}

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

/**
 * Applies one op under a row lock so concurrent editors cannot overwrite each other's changes.
 * Returns the new version, or null when the document is gone or the op would exceed the cap.
 */
export async function applyAnnotationOpToDocument(
  db: PostgresJsDatabase<typeof schema>,
  documentId: string,
  op: AnnotationOp
): Promise<number | null> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.collabDocuments)
      .where(eq(schema.collabDocuments.id, documentId))
      .limit(1)
      .for('update');
    const doc = rows[0];
    if (!doc) {
      return null;
    }

    const nextState = applyAnnotationOp(doc.documentState, op);
    if (nextState.annotations.length > MAX_COLLAB_ANNOTATIONS) {
      return null;
    }

    const nextVersion = doc.version + 1;
    await tx
      .update(schema.collabDocuments)
      .set({ documentState: nextState, version: nextVersion, updatedAt: new Date() })
      .where(eq(schema.collabDocuments.id, documentId));
    return nextVersion;
  });
}
