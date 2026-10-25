import { SHARE_EXPIRY_LABELS, SHARE_EXPIRY_OPTIONS, type ShareExpiry } from '@snapglow/cloud-core';
import type { IntegrationProvider } from '@snapglow/integrations-core';
import { INTEGRATION_LABELS, isEnterpriseIntegrationProvider } from '@snapglow/integrations-core';
import { Button, Label, Select, Slider } from '@snapglow/ui';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { ask } from '@tauri-apps/plugin-dialog';
import { useCallback, useRef, useState } from 'react';
import { captureExportCompleted } from '@/integrations/posthog/events';
import { isCloudConfigured } from '@/modules/cloud/config';
import { useCloudAuthStore } from '@/modules/cloud/store';
import { revokeShare, uploadShare } from '@/modules/cloud/uploadShare';
import { useEditorStore } from '@/modules/editor/store';
import { SendToIntegrationDialog } from '@/modules/integrations/components/SendToIntegrationDialog';
import { useIntegrationsStore } from '@/modules/integrations/store';
import { hasEnterpriseIntegrationsAccess } from '@/modules/licensing/premiumAccess';
import { useExportRender } from '../hooks/useExportRender';
import { useExportStore } from '../store';
import { copyExportToClipboard } from '../utils/copyExport';
import { EXPORT_FORMATS, type ExportFormat, formatLabel } from '../utils/formats';
import { saveExportBlob } from '../utils/saveExport';

export function ExportBar({ embedded = false }: { embedded?: boolean }) {
  const screenshot = useEditorStore((s) => s.screenshot);
  const format = useExportStore((s) => s.format);
  const quality = useExportStore((s) => s.quality);
  const shareExpiry = useExportStore((s) => s.shareExpiry);
  const isExporting = useExportStore((s) => s.isExporting);
  const lastMessage = useExportStore((s) => s.lastMessage);
  const setFormat = useExportStore((s) => s.setFormat);
  const setQuality = useExportStore((s) => s.setQuality);
  const setShareExpiry = useExportStore((s) => s.setShareExpiry);
  const setIsExporting = useExportStore((s) => s.setIsExporting);
  const setLastMessage = useExportStore((s) => s.setLastMessage);
  const isAuthenticated = useCloudAuthStore((s) => s.isAuthenticated);
  const cloudConfigured = isCloudConfigured();
  const connections = useIntegrationsStore((s) => s.connections);
  const connectedIntegrations = connections
    .filter((item) => item.connected)
    .map((item) => item.provider)
    .filter(
      (provider) => !isEnterpriseIntegrationProvider(provider) || hasEnterpriseIntegrationsAccess()
    );

  const { exportImage } = useExportRender();
  const dragBlobRef = useRef<Blob | null>(null);
  const [dragReady, setDragReady] = useState(false);
  const [lastShareToken, setLastShareToken] = useState<string | null>(null);
  const [sendProvider, setSendProvider] = useState<IntegrationProvider | null>(null);
  const [pendingSendBlob, setPendingSendBlob] = useState<Blob | null>(null);
  const [pendingSendFormat, setPendingSendFormat] = useState<ExportFormat>('png');

  const runExport = useCallback(
    async (action: 'save' | 'copy' | 'drag' | 'share' | 'send', provider?: IntegrationProvider) => {
      if (!screenshot || isExporting) {
        return;
      }

      if (
        action === 'send' &&
        provider &&
        isEnterpriseIntegrationProvider(provider) &&
        !hasEnterpriseIntegrationsAccess()
      ) {
        setLastMessage('Jira, Confluence, and Teams require Team Pro.');
        return;
      }

      setIsExporting(true);
      setLastMessage(null);

      try {
        if (action === 'copy') {
          const { size, durationMs } = await copyExportToClipboard(exportImage, 'png');
          captureExportCompleted({ format: 'png', file_size: size, duration_ms: durationMs });
          setLastMessage('Copied to clipboard');
          return;
        }

        const result = await exportImage(format, quality);
        captureExportCompleted({
          format: result.format,
          file_size: result.blob.size,
          duration_ms: result.durationMs,
        });

        const compressionMessage =
          result.compressionPercent && result.compressionPercent > 0
            ? ` · −${result.compressionPercent}%`
            : '';

        if (action === 'save') {
          const path = await saveExportBlob(result.blob, format);
          setLastMessage(path ? `Saved to ${path}${compressionMessage}` : 'Export cancelled');
          return;
        }

        if (action === 'share') {
          if (!isAuthenticated) {
            setLastMessage('Sign in to SnapGlow cloud in Settings before sharing');
            return;
          }

          const confirmed = await ask(
            'Upload this capture to SnapGlow cloud and create a shareable link?',
            {
              title: 'Share to cloud',
              kind: 'info',
              okLabel: 'Upload',
              cancelLabel: 'Cancel',
            }
          );

          if (!confirmed) {
            setLastMessage('Cloud upload cancelled');
            return;
          }

          const share = await uploadShare(result.blob, shareExpiry, `snapglow-export.${format}`);
          await writeText(share.url);
          setLastShareToken(share.token);
          setLastMessage(`Share link copied · ${share.url}${compressionMessage}`);
          return;
        }

        if (action === 'send') {
          if (!provider) {
            return;
          }

          const confirmed = await ask(
            `Send this capture to ${INTEGRATION_LABELS[provider]}? The image leaves this device only for this upload.`,
            {
              title: `Send to ${INTEGRATION_LABELS[provider]}`,
              kind: 'info',
              okLabel: 'Continue',
              cancelLabel: 'Cancel',
            }
          );

          if (!confirmed) {
            setLastMessage('Send cancelled');
            return;
          }

          setPendingSendBlob(result.blob);
          setPendingSendFormat(format);
          setSendProvider(provider);
          setLastMessage(`Choose a ${INTEGRATION_LABELS[provider]} destination…`);
          return;
        }

        dragBlobRef.current = result.blob;
        setDragReady(true);
        setLastMessage(`Drag the handle to another app${compressionMessage}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLastMessage(message);
      } finally {
        setIsExporting(false);
      }
    },
    [
      exportImage,
      format,
      isAuthenticated,
      isExporting,
      quality,
      screenshot,
      setIsExporting,
      setLastMessage,
      shareExpiry,
    ]
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!dragBlobRef.current) {
        event.preventDefault();
        return;
      }

      const file = new File([dragBlobRef.current], `snapglow-export.${format}`, {
        type: dragBlobRef.current.type,
      });
      event.dataTransfer.setData('text/uri-list', URL.createObjectURL(file));
      event.dataTransfer.items.add(file);
      event.dataTransfer.effectAllowed = 'copy';
    },
    [format]
  );

  if (!screenshot) {
    return null;
  }

  const shareButton = cloudConfigured ? (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={() => runExport('share')}
      disabled={isExporting}
      data-testid="export-share-button"
    >
      Share link
    </Button>
  ) : null;

  const sendMenu =
    connectedIntegrations.length > 0 ? (
      <div className="relative">
        <Select
          id="send-integration-select"
          defaultValue=""
          onChange={(event) => {
            const provider = event.target.value as IntegrationProvider;
            if (provider) {
              void runExport('send', provider);
              event.target.value = '';
            }
          }}
          disabled={isExporting}
          data-testid="export-send-select"
          aria-label="Send to integration"
        >
          <option value="">Send to…</option>
          {connectedIntegrations.map((provider) => (
            <option key={provider} value={provider}>
              {INTEGRATION_LABELS[provider]}
            </option>
          ))}
        </Select>
      </div>
    ) : null;

  const content = (
    <div className="w-full space-y-4" data-testid="export-bar">
      {!embedded ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Export</p>
            <p className="text-xs text-muted">PNG, JPG, WebP · copy · drag-out · cloud link</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => runExport('save')}
              disabled={isExporting}
              data-testid="export-save-button"
            >
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => runExport('copy')}
              disabled={isExporting}
              data-testid="export-copy-button"
            >
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => runExport('drag')}
              disabled={isExporting}
              data-testid="export-drag-button"
            >
              Prepare drag
            </Button>
            {shareButton}
            {sendMenu}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => runExport('save')}
              disabled={isExporting}
              data-testid="export-save-button"
            >
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
            <Label htmlFor="export-format" className="sr-only">
              Format
            </Label>
            <div className="w-24 shrink-0">
              <Select
                id="export-format"
                value={format}
                onChange={(event) => setFormat(event.target.value as ExportFormat)}
                data-testid="export-format-select"
              >
                {EXPORT_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {formatLabel(item)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => runExport('copy')}
              disabled={isExporting}
              data-testid="export-copy-button"
            >
              Copy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => runExport('drag')}
              disabled={isExporting}
              data-testid="export-drag-button"
            >
              Prepare drag
            </Button>
            {shareButton}
            {sendMenu}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {embedded ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="export-format">Format</Label>
            <Select
              id="export-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              data-testid="export-format-select"
            >
              {EXPORT_FORMATS.map((item) => (
                <option key={item} value={item}>
                  {formatLabel(item)}
                </option>
              ))}
            </Select>
          </div>
        )}

        {format !== 'png' ? (
          <div className="space-y-1.5">
            <Label>Quality ({quality}%)</Label>
            <Slider
              min={50}
              max={100}
              step={1}
              value={[quality]}
              onValueChange={(value) => setQuality(value[0] ?? quality)}
              data-testid="export-quality-slider"
            />
          </div>
        ) : null}

        {cloudConfigured ? (
          <div className="space-y-1.5">
            <Label htmlFor="share-expiry">Link expiry</Label>
            <Select
              id="share-expiry"
              value={shareExpiry}
              onChange={(event) => setShareExpiry(event.target.value as ShareExpiry)}
              data-testid="share-expiry-select"
            >
              {SHARE_EXPIRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SHARE_EXPIRY_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      {dragReady && dragBlobRef.current ? (
        <button
          type="button"
          draggable
          onDragStart={handleDragStart}
          className="sg-focus-ring flex w-full cursor-grab items-center justify-center rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-foreground active:cursor-grabbing"
          data-testid="export-drag-handle"
        >
          Drag this image into Slack, Mail, Finder…
        </button>
      ) : null}

      {lastMessage ? (
        <p className="text-xs text-muted" data-testid="export-status-message">
          {lastMessage}
        </p>
      ) : null}

      {lastShareToken ? (
        <Button
          variant="ghost"
          size="sm"
          data-testid="revoke-last-share"
          onClick={() => {
            void revokeShare(lastShareToken)
              .then(() => {
                setLastShareToken(null);
                setLastMessage('Share link revoked');
              })
              .catch((error) =>
                setLastMessage(error instanceof Error ? error.message : String(error))
              );
          }}
        >
          Revoke last link
        </Button>
      ) : null}

      {sendProvider && pendingSendBlob ? (
        <SendToIntegrationDialog
          provider={sendProvider}
          exportBlob={pendingSendBlob}
          filename={`snapglow-export.${pendingSendFormat}`}
          mimeType={pendingSendBlob.type || 'image/png'}
          onClose={() => {
            setSendProvider(null);
            setPendingSendBlob(null);
          }}
          onSent={async (message, url) => {
            if (url) {
              await writeText(url);
              setLastMessage(`${message} · link copied`);
              return;
            }
            setLastMessage(message);
          }}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return <div className="rounded-lg border border-border bg-surface p-4">{content}</div>;
}
