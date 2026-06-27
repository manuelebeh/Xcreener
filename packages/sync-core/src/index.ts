export interface SyncCursor {
  librarySince: string | null;
  settingsSince: string | null;
}

export interface SettingsPatch {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface SyncLibraryItem {
  id: string;
  title: string | null;
  mimeType: string;
  byteSize: number;
  tags: string[];
  localId: string | null;
  syncVersion: number;
  deletedAt: string | null;
  assetUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLibraryResponse {
  items: SyncLibraryItem[];
  cursor: string;
}

export interface UserSettingsResponse {
  settings: SettingsPatch[];
  cursor: string;
}

export const SYNCABLE_SETTING_KEYS = [
  'theme',
  'locale',
  'captureShortcut',
  'watermarkEnabled',
  'watermarkDisplayName',
  'watermarkPosition',
  'watermarkOpacity',
] as const;

export type SyncableSettingKey = (typeof SYNCABLE_SETTING_KEYS)[number];

/** Last-write-wins merge by updatedAt timestamp. */
export function mergeSettingsPatches(
  local: SettingsPatch[],
  remote: SettingsPatch[]
): SettingsPatch[] {
  const map = new Map<string, SettingsPatch>();
  for (const patch of local) {
    map.set(patch.key, patch);
  }
  for (const patch of remote) {
    const existing = map.get(patch.key);
    if (!existing || new Date(patch.updatedAt) >= new Date(existing.updatedAt)) {
      map.set(patch.key, patch);
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}
