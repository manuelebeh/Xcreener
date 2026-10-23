import { z } from 'zod';
import { DEFAULT_GRADIENT_PRESET_ID } from '@/modules/editor/engine/gradients';
import type { AspectRatio, ShadowConfig } from '@/modules/editor/types';

const RATIO_PATTERN = /^\d+(\.\d+)?:\d+(\.\d+)?$/;

export const aspectRatioSchema = z.custom<AspectRatio>(
  (value) => value === 'free' || (typeof value === 'string' && RATIO_PATTERN.test(value)),
  { message: 'Invalid aspect ratio' }
);

export const serializableBackgroundSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('gradient'),
    presetId: z.string().min(1),
  }),
  z.object({
    type: z.literal('solid'),
    color: z.string().min(1),
  }),
]);

export type SerializableBackground = z.infer<typeof serializableBackgroundSchema>;

export const shadowConfigSchema = z.object({
  opacity: z.number().min(0).max(1),
  blur: z.number().min(0),
  offsetX: z.number(),
  offsetY: z.number(),
  color: z.string().min(1),
});

export const customPresetStyleSchema = z.object({
  background: serializableBackgroundSchema,
  padding: z.number().int().min(0).max(200),
  borderRadius: z.number().int().min(0).max(32),
  shadow: shadowConfigSchema,
});

export const createCustomPresetInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  aspectRatio: aspectRatioSchema,
  style: customPresetStyleSchema,
});

const DEFAULT_SHADOW: ShadowConfig = {
  opacity: 0.35,
  blur: 24,
  offsetX: 0,
  offsetY: 8,
  color: '#000000',
};

const DEFAULT_BACKGROUND: SerializableBackground = {
  type: 'gradient',
  presetId: DEFAULT_GRADIENT_PRESET_ID,
};

function parseJson(json: string): unknown {
  return JSON.parse(json) as unknown;
}

export function parseStoredAspectRatio(value: string | null): AspectRatio {
  const result = aspectRatioSchema.safeParse(value);
  return result.success ? result.data : '16:9';
}

export function parseStoredBackground(json: string): SerializableBackground {
  try {
    const result = serializableBackgroundSchema.safeParse(parseJson(json));
    return result.success ? result.data : DEFAULT_BACKGROUND;
  } catch {
    return DEFAULT_BACKGROUND;
  }
}

export function parseStoredShadow(json: string): ShadowConfig {
  try {
    const result = shadowConfigSchema.safeParse(parseJson(json));
    return result.success ? result.data : DEFAULT_SHADOW;
  } catch {
    return DEFAULT_SHADOW;
  }
}

export function serializeStoredBackground(
  background: SerializableBackground | { type: string }
): string {
  const result = serializableBackgroundSchema.safeParse(background);
  if (!result.success) {
    return JSON.stringify(DEFAULT_BACKGROUND);
  }
  return JSON.stringify(result.data);
}

export function serializeStoredShadow(shadow: ShadowConfig): string {
  const result = shadowConfigSchema.safeParse(shadow);
  if (!result.success) {
    return JSON.stringify(DEFAULT_SHADOW);
  }
  return JSON.stringify(result.data);
}
