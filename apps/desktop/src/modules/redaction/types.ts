import type { DetectionKind, SensitiveRegion } from '@snapglow/redaction-core';

export type RedactionStatus = 'idle' | 'scanning' | 'ready' | 'error';

export interface Detection extends SensitiveRegion {
  id: string;
}

export const DETECTION_KIND_COLORS: Record<DetectionKind, string> = {
  email: 'rgba(59, 130, 246, 0.35)',
  phone: 'rgba(16, 185, 129, 0.35)',
  card: 'rgba(245, 158, 11, 0.35)',
  api_key: 'rgba(239, 68, 68, 0.35)',
  url: 'rgba(168, 85, 247, 0.35)',
  password: 'rgba(244, 63, 94, 0.35)',
};

export function detectionColor(kind: DetectionKind | string): string {
  return DETECTION_KIND_COLORS[kind as DetectionKind] ?? 'rgba(148, 163, 184, 0.35)';
}
