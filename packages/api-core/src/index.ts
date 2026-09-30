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

const shadowSchema = z.object({
  opacity: z.number(),
  blur: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
  color: z.string(),
});

const transformSchema = z.object({
  scale: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
});

const frameSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['social', 'standard', 'custom']),
  width: z.number(),
  height: z.number(),
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '1.91:1', 'free']),
  icon: z.string().optional(),
});

const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gradient'), presetId: z.string() }),
  z.object({ type: z.literal('solid'), color: z.string() }),
  z.object({ type: z.literal('image'), sourceId: z.string().nullable() }),
]);

const annotationSchema = z
  .object({
    id: z.string(),
    type: z.string(),
  })
  .passthrough();

export const collabDocumentStateSchema = z.object({
  screenshotWidth: z.number().positive(),
  screenshotHeight: z.number().positive(),
  background: backgroundSchema,
  padding: z.number().min(0),
  borderRadius: z.number().min(0),
  shadow: shadowSchema,
  frame: frameSchema.nullable(),
  transform: transformSchema,
  annotations: z.array(annotationSchema),
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
