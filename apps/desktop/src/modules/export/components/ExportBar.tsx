import { Button, Label, Select, Slider } from '@snapglow/ui';
import { useCallback, useRef, useState } from 'react';
import { captureExportCompleted } from '@/integrations/posthog/events';
import { useEditorStore } from '@/modules/editor/store';
import { useExportRender } from '../hooks/useExportRender';
import { useExportStore } from '../store';
import { copyExportToClipboard } from '../utils/copyExport';
import { EXPORT_FORMATS, type ExportFormat, formatLabel } from '../utils/formats';
import { saveExportBlob } from '../utils/saveExport';

export function ExportBar() {
  const screenshot = useEditorStore((s) => s.screenshot);
  const format = useExportStore((s) => s.format);
  const quality = useExportStore((s) => s.quality);
  const isExporting = useExportStore((s) => s.isExporting);
  const lastMessage = useExportStore((s) => s.lastMessage);
  const setFormat = useExportStore((s) => s.setFormat);
  const setQuality = useExportStore((s) => s.setQuality);
  const setIsExporting = useExportStore((s) => s.setIsExporting);
  const setLastMessage = useExportStore((s) => s.setLastMessage);

  const { exportImage } = useExportRender();
  const dragBlobRef = useRef<Blob | null>(null);
  const [dragReady, setDragReady] = useState(false);

  const runExport = useCallback(
    async (action: 'save' | 'copy' | 'drag') => {
      if (!screenshot || isExporting) {
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

        if (action === 'save') {
          const path = await saveExportBlob(result.blob, format);
          setLastMessage(path ? `Saved to ${path}` : 'Export cancelled');
          return;
        }

        dragBlobRef.current = result.blob;
        setDragReady(true);
        setLastMessage('Drag the handle to another app');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLastMessage(message);
      } finally {
        setIsExporting(false);
      }
    },
    [exportImage, format, isExporting, quality, screenshot, setIsExporting, setLastMessage]
  );

  const handleDragStart = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
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

  return (
    <div
      className="w-full space-y-3 rounded-xl border border-border bg-surface p-4"
      data-testid="export-bar"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Export</p>
          <p className="text-xs text-muted">PNG, JPG, WebP · copy · drag-out</p>
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
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
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

        {format !== 'png' ? (
          <div className="space-y-1">
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
      </div>

      {dragReady && dragBlobRef.current ? (
        <button
          type="button"
          draggable
          onDragStart={handleDragStart}
          className="flex w-full cursor-grab items-center justify-center rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-foreground active:cursor-grabbing"
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
    </div>
  );
}
