import type { CollabDocumentState } from '@snapglow/collab-core';
import { z } from 'zod';

export const API_KEY_PREFIX = 'sg_live_';

export const API_RATE_LIMITS = {
  general: { limit: 120, windowSec: 60 },
  upload: { limit: 20, windowSec: 3600 },
  export: { limit: 30, windowSec: 3600 },
} as const;

export const EXPORT_FORMATS = ['png', 'jpg', 'webp'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  keyPrefix: string;
  createdAt: string;
}

export interface CaptureResponse {
  id: string;
  workspaceId: string;
  title: string | null;
  mimeType: string;
  byteSize: number;
  tags: string[];
  documentState: CollabDocumentState;
  screenshotUrl: string;
  exportUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaptureListResponse {
  items: CaptureResponse[];
  nextCursor: string | null;
}

export interface ExportCaptureResponse {
  exportUrl: string;
  format: ExportFormat;
  byteSize: number;
  width: number;
  height: number;
}

export interface PublishCaptureResponse {
  token: string;
  shareUrl: string;
  embedUrl: string;
  expiresAt: null;
}

/** Annotations per document, shared by the REST, WebSocket and public API paths. */
export const MAX_COLLAB_ANNOTATIONS = 500;

/** Output canvas budget for server rendering (about 6300 x 6300). */
export const MAX_RENDER_PIXELS = 40_000_000;

// Bounds sit well above what the editor UI produces (padding slider 0-200, frames up to 1920 px)
// and far below what would stall the server renderer.
const MAX_SCREENSHOT_SIDE = 16_384;
const MAX_FRAME_SIDE = 8192;

const boundedNumber = (min: number, max: number) => z.number().finite().min(min).max(max);

const shadowSchema = z.object({
  opacity: boundedNumber(0, 1),
  blur: boundedNumber(0, 256),
  offsetX: boundedNumber(-256, 256),
  offsetY: boundedNumber(-256, 256),
  color: z.string().max(64),
});

const transformSchema = z.object({
  scale: boundedNumber(0.05, 20),
  offsetX: boundedNumber(-MAX_SCREENSHOT_SIDE, MAX_SCREENSHOT_SIDE),
  offsetY: boundedNumber(-MAX_SCREENSHOT_SIDE, MAX_SCREENSHOT_SIDE),
});

const frameSchema = z.object({
  id: z.string().max(128),
  name: z.string().max(128),
  category: z.enum(['social', 'standard', 'custom']),
  width: boundedNumber(1, MAX_FRAME_SIDE),
  height: boundedNumber(1, MAX_FRAME_SIDE),
  // Mirrors editor-core `AspectRatio` (`${number}:${number}` | 'free').
  aspectRatio: z.union([z.literal('free'), z.string().regex(/^\d+(\.\d+)?:\d+(\.\d+)?$/)]),
  icon: z.string().max(128).optional(),
  network: z.string().max(32).optional(),
});

const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gradient'), presetId: z.string().max(128) }),
  z.object({ type: z.literal('solid'), color: z.string().max(64) }),
  z.object({ type: z.literal('image'), sourceId: z.string().max(128).nullable() }),
]);

const annotationSchema = z
  .object({
    id: z.string().min(1).max(128),
    type: z.string().max(32),
  })
  .passthrough();

export const collabDocumentStateSchema = z.object({
  screenshotWidth: boundedNumber(1, MAX_SCREENSHOT_SIDE),
  screenshotHeight: boundedNumber(1, MAX_SCREENSHOT_SIDE),
  background: backgroundSchema,
  padding: boundedNumber(0, 1024),
  borderRadius: boundedNumber(0, 512),
  shadow: shadowSchema,
  frame: frameSchema.nullable(),
  transform: transformSchema,
  annotations: z.array(annotationSchema).max(MAX_COLLAB_ANNOTATIONS),
});

export const beautifyCaptureSchema = z.object({
  documentState: collabDocumentStateSchema,
  title: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const exportCaptureSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  quality: z.number().min(1).max(100).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export function buildApiKeyPlaintext(secret: string): string {
  return `${API_KEY_PREFIX}${secret}`;
}

export function isApiKeyPlaintext(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length > API_KEY_PREFIX.length + 8;
}

export function apiKeyDisplayPrefix(plaintext: string): string {
  return plaintext.slice(0, API_KEY_PREFIX.length + 4);
}

export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}

export function mimeTypeForExportFormat(format: ExportFormat): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
  }
}

export function defaultExportQuality(format: ExportFormat): number {
  return format === 'png' ? 100 : 90;
}
