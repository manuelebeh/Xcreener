import type { BrandKitConfig } from '@snapglow/team-core';
import { getSetting, setSetting } from '@/db';
import { SETTING_KEYS } from '@/shared/types/settings';

function cacheKey(workspaceId: string): string {
  return `${SETTING_KEYS.brandKitCache}:${workspaceId}`;
}

export async function cacheBrandKit(workspaceId: string, kit: BrandKitConfig): Promise<void> {
  await setSetting(cacheKey(workspaceId), JSON.stringify(kit));
}

export async function loadCachedBrandKit(workspaceId: string): Promise<BrandKitConfig | null> {
  const raw = await getSetting(cacheKey(workspaceId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as BrandKitConfig;
  } catch {
    return null;
  }
}
