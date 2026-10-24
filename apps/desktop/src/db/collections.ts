import type { DbCollectionRow } from '@/shared/types/ipc';
import {
  dbCollectionsAddCapture,
  dbCollectionsCreate,
  dbCollectionsDelete,
  dbCollectionsForCapture,
  dbCollectionsList,
  dbCollectionsRemoveCapture,
  dbCollectionsRename,
} from '@/tauri/commands';
import { ensureMigrationsApplied } from './migrate';

export interface StoredCollection {
  id: number;
  name: string;
  createdAt: string;
}

function rowToStored(row: DbCollectionRow): StoredCollection {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function listCollections(): Promise<StoredCollection[]> {
  await ensureMigrationsApplied();
  return (await dbCollectionsList()).map(rowToStored);
}

export async function createCollection(name: string): Promise<StoredCollection> {
  await ensureMigrationsApplied();
  return rowToStored(await dbCollectionsCreate(name));
}

export async function renameCollection(id: number, name: string): Promise<void> {
  await ensureMigrationsApplied();
  await dbCollectionsRename(id, name);
}

export async function deleteCollection(id: number): Promise<void> {
  await ensureMigrationsApplied();
  await dbCollectionsDelete(id);
}

export async function addCaptureToCollection(
  captureId: number,
  collectionId: number
): Promise<void> {
  await ensureMigrationsApplied();
  await dbCollectionsAddCapture(captureId, collectionId);
}

export async function removeCaptureFromCollection(
  captureId: number,
  collectionId: number
): Promise<void> {
  await ensureMigrationsApplied();
  await dbCollectionsRemoveCapture(captureId, collectionId);
}

export async function getCaptureCollectionIds(captureId: number): Promise<number[]> {
  await ensureMigrationsApplied();
  return dbCollectionsForCapture(captureId);
}
