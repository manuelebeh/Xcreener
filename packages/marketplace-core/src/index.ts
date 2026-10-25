import type { BackgroundConfig, FramePreset, ShadowConfig } from '@xcreener/editor-core';
import { z } from 'zod';

export type TemplateStatus = 'pending' | 'approved' | 'rejected';

export const TEMPLATE_STATUSES: TemplateStatus[] = ['pending', 'approved', 'rejected'];

/** Beautify style shared in the community marketplace (no screenshot or annotations). */
export interface TemplateStyle {
  background: BackgroundConfig;
  padding: number;
  borderRadius: number;
  shadow: ShadowConfig;
  frame: FramePreset | null;
}

const backgroundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('gradient'), presetId: z.string().min(1) }),
  z.object({ type: z.literal('solid'), color: z.string().min(1) }),
  z.object({
    type: z.literal('image'),
    sourceId: z.string().nullable(),
  }),
]);

const shadowSchema = z.object({
  opacity: z.number().min(0).max(1),
  blur: z.number().min(0),
  offsetX: z.number(),
  offsetY: z.number(),
  color: z.string().min(1),
});

const framePresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['social', 'standard', 'custom']),
  width: z.number().min(0),
  height: z.number().min(0),
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '1.91:1', 'free']),
  icon: z.string().optional(),
});

export const templateStyleSchema = z.object({
  background: backgroundSchema,
  padding: z.number().min(0).max(512),
  borderRadius: z.number().min(0).max(128),
  shadow: shadowSchema,
  frame: framePresetSchema.nullable(),
});

export const createTemplateSubmissionSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  style: templateStyleSchema,
  tags: z.array(z.string().min(1).max(32)).max(10).default([]),
  previewUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith('https://'), 'previewUrl must use https')
    .optional(),
});

export const moderateTemplateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  featured: z.boolean().optional(),
  rejectionReason: z.string().max(500).optional(),
});

export type CreateTemplateSubmissionInput = z.infer<typeof createTemplateSubmissionSchema>;
export type ModerateTemplateInput = z.infer<typeof moderateTemplateSchema>;

export interface TemplateListingResponse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  authorId: string;
  status: TemplateStatus;
  style: TemplateStyle;
  tags: string[];
  previewUrl: string | null;
  downloadCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResponse {
  items: TemplateListingResponse[];
  total: number;
}

export function slugifyTemplateTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function templateStyleToCustomPresetInput(style: TemplateStyle, name: string) {
  const frame = style.frame;
  return {
    name,
    width: frame?.width ?? 1920,
    height: frame?.height ?? 1080,
    aspectRatio: frame?.aspectRatio ?? ('16:9' as const),
    style: {
      background: style.background,
      padding: style.padding,
      borderRadius: style.borderRadius,
      shadow: style.shadow,
    },
  };
}
