import {
  mergeSettingsPatches,
  type SettingsPatch,
  SYNCABLE_SETTING_KEYS,
  type SyncLibraryItem,
  type SyncLibraryResponse,
  type UserSettingsResponse,
} from '@snapglow/sync-core';
import { setSetting } from '@/db';
import { captureUidExists, getCapture, insertCapture, pruneCaptures } from '@/db/captures';
import { writeCaptureFiles } from '@/modules/history/utils/captureFiles';
import { useSettingsStore } from '@/modules/settings/store';
import { getWorkspaceHeaders } from '@/modules/team/headers';
import { SETTING_KEYS } from '@/shared/types/settings';
import { getValidAccessToken } from './auth';
import { getApiUrl } from './config';
import { useCloudAuthStore } from './store';

const LIBRARY_CURSOR_KEY = 'sync.library.cursor';
const SETTINGS_CURSOR_KEY = 'sync.settings.cursor';
const PULLED_LIBRARY_IDS_KEY = 'sync.pulledLibraryIds';

async function getStoredCursor(key: string): Promise<string | null> {
  return localStorage.getItem(key);
}

async function setStoredCursor(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value);
}

function getPulledLibraryIds(): Set<string> {
  const raw = localStorage.getItem(PULLED_LIBRARY_IDS_KEY);
  if (!raw) {
    return new Set();
  }
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function savePulledLibraryIds(ids: Set<string>): void {
  localStorage.setItem(PULLED_LIBRARY_IDS_KEY, JSON.stringify([...ids]));
}

function settingKeyToStoreKey(key: string): string | null {
  const map: Record<string, string> = {
    theme: SETTING_KEYS.theme,
    locale: SETTING_KEYS.locale,
    captureShortcut: SETTING_KEYS.captureShortcut,
    watermarkEnabled: SETTING_KEYS.watermarkEnabled,
    watermarkDisplayName: SETTING_KEYS.watermarkDisplayName,
    watermarkPosition: SETTING_KEYS.watermarkPosition,
    watermarkOpacity: SETTING_KEYS.watermarkOpacity,
  };
  return map[key] ?? null;
}

async function readImageDimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
  const blob = new Blob([bytes]);
  const bitmap = await createImageBitmap(blob);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

/** Items uploaded before captures had a `uid` carry the uploader's numeric SQLite id. */
function isLegacyNumericLocalId(localId: string): boolean {
  return /^\d+$/.test(localId);
}

async function hasLocalCopy(localId: string): Promise<boolean> {
  if (isLegacyNumericLocalId(localId)) {
    return (await getCapture(Number(localId))) !== null;
  }
  return captureUidExists(localId);
}

/** @internal Exported for tests. */
export async function importSyncedLibraryItem(
  item: SyncLibraryItem,
  pulledIds: Set<string>,
  headers: Record<string, string>
): Promise<boolean> {
  if (item.deletedAt) {
    return false;
  }

  if (pulledIds.has(item.id)) {
    return false;
  }

  if (item.localId && (await hasLocalCopy(item.localId))) {
    pulledIds.add(item.id);
    return false;
  }

  // The release CSP only allows the API origin, so the asset comes through the API.
  const response = await fetch(`${getApiUrl()}/v1/library/${item.id}/content`, { headers });
  if (!response.ok) {
    return false;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const { width, height } = await readImageDimensions(bytes);
  const createdAt = new Date(item.createdAt);
  const { capturePath, thumbnailPath } = await writeCaptureFiles(bytes, width, height, createdAt);
  const filename = item.title?.trim() || `cloud-${item.id.slice(0, 8)}.png`;

  await insertCapture({
    filename,
    filepath: capturePath,
    thumbnail: thumbnailPath,
    width,
    height,
    fileSize: bytes.length,
    format: item.mimeType.includes('jpeg') || item.mimeType.includes('jpg') ? 'jpg' : 'png',
    tags: item.tags,
    uid: item.localId && !isLegacyNumericLocalId(item.localId) ? item.localId : crypto.randomUUID(),
  });
  await pruneCaptures(30);
  pulledIds.add(item.id);
  return true;
}

async function applySyncedLibraryItems(
  items: SyncLibraryItem[],
  headers: Record<string, string>
): Promise<number> {
  const pulledIds = getPulledLibraryIds();
  let imported = 0;

  for (const item of items) {
    try {
      const didImport = await importSyncedLibraryItem(item, pulledIds, headers);
      if (didImport) {
        imported += 1;
      }
    } catch (error) {
      console.debug('[cloud] library import skipped', item.id, error);
    }
  }

  savePulledLibraryIds(pulledIds);
  return imported;
}

export async function pullCloudSync(): Promise<void> {
  if (!useCloudAuthStore.getState().isAuthenticated) {
    return;
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return;
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    ...getWorkspaceHeaders(),
  };

  const librarySince = (await getStoredCursor(LIBRARY_CURSOR_KEY)) ?? '';
  const libraryResponse = await fetch(
    `${getApiUrl()}/v1/sync/library${librarySince ? `?since=${encodeURIComponent(librarySince)}` : ''}`,
    { headers }
  );

  if (libraryResponse.ok) {
    const libraryPayload = (await libraryResponse.json()) as SyncLibraryResponse;
    await setStoredCursor(LIBRARY_CURSOR_KEY, libraryPayload.cursor);
    await applySyncedLibraryItems(libraryPayload.items, headers);
    useCloudAuthStore.getState().setLibrarySyncStatus({
      at: new Date().toISOString(),
      error: null,
      pulledCount: libraryPayload.items.length,
    });
  }

  const settingsSince = (await getStoredCursor(SETTINGS_CURSOR_KEY)) ?? '';
  const settingsResponse = await fetch(
    `${getApiUrl()}/v1/users/me/settings${settingsSince ? `?since=${encodeURIComponent(settingsSince)}` : ''}`,
    { headers }
  );

  if (!settingsResponse.ok) {
    return;
  }

  const settingsPayload = (await settingsResponse.json()) as UserSettingsResponse;
  await setStoredCursor(SETTINGS_CURSOR_KEY, settingsPayload.cursor);

  if (settingsPayload.settings.length === 0) {
    return;
  }

  const localPatches: SettingsPatch[] = SYNCABLE_SETTING_KEYS.map((key) => {
    const store = useSettingsStore.getState();
    const value =
      key === 'theme'
        ? store.theme
        : key === 'locale'
          ? store.locale
          : key === 'captureShortcut'
            ? store.captureShortcut
            : key === 'watermarkEnabled'
              ? store.watermarkEnabled
              : key === 'watermarkDisplayName'
                ? store.watermarkDisplayName
                : key === 'watermarkPosition'
                  ? store.watermarkPosition
                  : key === 'watermarkOpacity'
                    ? store.watermarkOpacity
                    : null;
    return { key, value, updatedAt: new Date().toISOString() };
  });

  const merged = mergeSettingsPatches(localPatches, settingsPayload.settings);

  for (const patch of merged) {
    const settingKey = settingKeyToStoreKey(patch.key);
    if (!settingKey || patch.value === null || patch.value === undefined) {
      continue;
    }
    await setSetting(settingKey, String(patch.value));
    const store = useSettingsStore.getState();
    if (patch.key === 'theme') store.setTheme(patch.value as typeof store.theme);
    if (patch.key === 'locale') store.setLocale(patch.value as typeof store.locale);
    if (patch.key === 'captureShortcut') store.setCaptureShortcut(String(patch.value));
    if (patch.key === 'watermarkEnabled')
      store.setWatermarkEnabled(patch.value === 'true' || patch.value === true);
    if (patch.key === 'watermarkDisplayName') store.setWatermarkDisplayName(String(patch.value));
    if (patch.key === 'watermarkPosition')
      store.setWatermarkPosition(patch.value as typeof store.watermarkPosition);
    if (patch.key === 'watermarkOpacity') store.setWatermarkOpacity(Number(patch.value));
  }
}

export async function pushSettingsSync(): Promise<void> {
  if (!useCloudAuthStore.getState().isAuthenticated) {
    return;
  }

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return;
  }

  const store = useSettingsStore.getState();
  const now = new Date().toISOString();
  const settings: SettingsPatch[] = [
    { key: 'theme', value: store.theme, updatedAt: now },
    { key: 'locale', value: store.locale, updatedAt: now },
    { key: 'captureShortcut', value: store.captureShortcut, updatedAt: now },
    { key: 'watermarkEnabled', value: store.watermarkEnabled, updatedAt: now },
    { key: 'watermarkDisplayName', value: store.watermarkDisplayName, updatedAt: now },
    { key: 'watermarkPosition', value: store.watermarkPosition, updatedAt: now },
    { key: 'watermarkOpacity', value: store.watermarkOpacity, updatedAt: now },
  ];

  await fetch(`${getApiUrl()}/v1/users/me/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...getWorkspaceHeaders(),
    },
    body: JSON.stringify({ settings }),
  });
}

export function startPeriodicSync(intervalMs = 60_000): () => void {
  const timer = setInterval(() => {
    void pullCloudSync();
  }, intervalMs);
  void pullCloudSync();
  return () => clearInterval(timer);
}
