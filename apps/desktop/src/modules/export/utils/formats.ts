export type ExportFormat = 'png' | 'jpg' | 'webp';

export const EXPORT_FORMATS: ExportFormat[] = ['png', 'jpg', 'webp'];

export function formatLabel(format: ExportFormat): string {
  return format.toUpperCase();
}
