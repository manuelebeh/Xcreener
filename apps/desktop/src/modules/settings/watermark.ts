import type { WatermarkConfig } from '@snapglow/editor-core';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { AppSettings } from '@/shared/types/settings';

import type { WatermarkConfig } from '@snapglow/editor-core';
import type { BrandKitConfig } from '@snapglow/team-core';
import { isPaidPlan } from '@snapglow/team-core';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { AppSettings } from '@/shared/types/settings';
import { useTeamStore } from '@/modules/team/store';
import { useSettingsStore } from '@/modules/settings/store';

export function watermarkFromSettings(settings: Pick<
  AppSettings,
  | 'watermarkEnabled'
  | 'watermarkDisplayName'
  | 'watermarkUrl'
  | 'watermarkLogoPath'
  | 'watermarkPosition'
  | 'watermarkOpacity'
  | 'useTeamBrandKit'
>): WatermarkConfig {
  const teamMerged = resolveTeamBrandKitWatermark(settings.useTeamBrandKit);
  if (teamMerged) {
    return teamMerged;
  }

  return {
    enabled: settings.watermarkEnabled,
    logoPath: settings.watermarkLogoPath || null,
    displayName: settings.watermarkDisplayName || null,
    url: settings.watermarkUrl || null,
    position: settings.watermarkPosition,
    opacity: settings.watermarkOpacity,
  };
}

function resolveTeamBrandKitWatermark(useTeamBrandKit: boolean): WatermarkConfig | null {
  if (!useTeamBrandKit) {
    return null;
  }

  const { activeWorkspaceId, workspaces, brandKit } = useTeamStore.getState();
  if (!activeWorkspaceId || !brandKit) {
    return null;
  }

  const workspace = workspaces.find((item) => item.id === activeWorkspaceId);
  if (!workspace || !isPaidPlan(workspace.plan)) {
    return null;
  }

  const localSettings = useSettingsStore.getState();
  const teamWatermark = brandKit.watermark ?? {};

  return {
    enabled: teamWatermark.enabled ?? true,
    logoPath: brandKit.logoUrl ?? localSettings.watermarkLogoPath ?? null,
    displayName:
      teamWatermark.displayName ?? workspace.name ?? localSettings.watermarkDisplayName ?? null,
    url: teamWatermark.url ?? localSettings.watermarkUrl ?? null,
    position: teamWatermark.position ?? localSettings.watermarkPosition,
    opacity: teamWatermark.opacity ?? localSettings.watermarkOpacity,
  };
}

export async function loadWatermarkLogoImage(
  logoPath: string | null | undefined
): Promise<HTMLImageElement | null> {
  if (!logoPath?.trim()) {
    return null;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = logoPath.startsWith('http') ? logoPath : convertFileSrc(logoPath);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Failed to load watermark logo'));
  });
  return image;
}

export function getCachedBrandKit(): BrandKitConfig | null {
  return useTeamStore.getState().brandKit;
}
