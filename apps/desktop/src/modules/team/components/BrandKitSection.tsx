import { isPaidPlan } from '@xcreener/team-core';
import { Button, Input } from '@xcreener/ui';
import { setSetting } from '@/db';
import { useSettingsStore } from '@/modules/settings/store';
import { SETTING_KEYS } from '@/shared/types/settings';
import { uploadBrandKitLogo } from '../api';
import { useTeamStore } from '../store';

export function BrandKitSection() {
  const activeWorkspace = useTeamStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
  );
  const brandKit = useTeamStore((state) => state.brandKit);
  const saveBrandKit = useTeamStore((state) => state.saveBrandKit);
  const useTeamBrandKit = useSettingsStore((state) => state.useTeamBrandKit);
  const setUseTeamBrandKit = useSettingsStore((state) => state.setUseTeamBrandKit);

  if (!activeWorkspace || !isPaidPlan(activeWorkspace.plan)) {
    return null;
  }

  const isAdmin = activeWorkspace.role === 'admin';
  const watermark = brandKit?.watermark ?? {};

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="m-0 text-sm font-medium">Team brand kit</p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useTeamBrandKit}
          onChange={(event) => {
            setUseTeamBrandKit(event.target.checked);
            void setSetting(SETTING_KEYS.useTeamBrandKit, String(event.target.checked));
          }}
          className="sg-focus-ring size-4 rounded border-border"
        />
        Use team brand kit on exports
      </label>
      {brandKit?.logoUrl ? (
        <img src={brandKit.logoUrl} alt="Team logo" className="h-10 w-auto rounded" />
      ) : null}
      {isAdmin ? (
        <>
          <label htmlFor="brand-display-name" className="block text-xs font-medium">
            Watermark name
            <Input
              id="brand-display-name"
              className="mt-1"
              defaultValue={watermark.displayName ?? activeWorkspace.name}
              onBlur={(event) => {
                void saveBrandKit({
                  colors: brandKit?.colors ?? {},
                  fonts: brandKit?.fonts ?? {},
                  watermark: {
                    ...watermark,
                    enabled: true,
                    displayName: event.target.value,
                  },
                });
              }}
            />
          </label>
          <label htmlFor="brand-primary" className="block text-xs font-medium">
            Primary color
            <Input
              id="brand-primary"
              className="mt-1 font-mono text-xs"
              defaultValue={brandKit?.colors.primary ?? '#6366f1'}
              onBlur={(event) => {
                void saveBrandKit({
                  colors: { ...(brandKit?.colors ?? {}), primary: event.target.value },
                  fonts: brandKit?.fonts ?? {},
                  watermark: { ...watermark, enabled: true },
                });
              }}
            />
          </label>
        </>
      ) : (
        <p className="text-xs text-muted">Brand kit is managed by workspace admins.</p>
      )}
      {isAdmin ? (
        <div>
          <label htmlFor="brand-kit-logo" className="block text-xs font-medium">
            Upload logo
          </label>
          <Input
            id="brand-kit-logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="mt-1"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file || !activeWorkspace) {
                return;
              }
              void uploadBrandKitLogo(activeWorkspace.id, file).then(() =>
                useTeamStore.getState().refreshBrandKit()
              );
            }}
          />
        </div>
      ) : null}
      {!isAdmin && brandKit?.updatedAt ? (
        <p className="text-xs text-muted">
          Last updated {new Date(brandKit.updatedAt).toLocaleString()}
        </p>
      ) : null}
      {isAdmin ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            void saveBrandKit({
              colors: brandKit?.colors ?? {},
              fonts: brandKit?.fonts ?? {},
              watermark: { ...watermark, enabled: true, opacity: watermark.opacity ?? 45 },
            })
          }
        >
          Save brand kit
        </Button>
      ) : null}
    </div>
  );
}
