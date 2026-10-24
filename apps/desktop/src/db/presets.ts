import type { CustomPresetStyle } from '@/modules/editor/store';
import type { AspectRatio, BackgroundConfig, FramePreset } from '@/modules/editor/types';
import type { DbCustomPresetRow } from '@/shared/types/ipc';
import { dbPresetsCreate, dbPresetsDelete, dbPresetsList } from '@/tauri/commands';
import { ensureMigrationsApplied } from './migrate';
import {
  createCustomPresetInputSchema,
  parseStoredAspectRatio,
  parseStoredBackground,
  parseStoredShadow,
  type SerializableBackground,
  serializeStoredBackground,
  serializeStoredShadow,
} from './schemas/presetSchemas';

const DEFAULT_BORDER_RADIUS = 12;

export interface StoredCustomPreset {
  id: number;
  name: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  style: CustomPresetStyle;
}

function serializeBackground(background: BackgroundConfig): SerializableBackground {
  if (background.type === 'gradient') {
    return { type: 'gradient', presetId: background.presetId };
  }
  if (background.type === 'solid') {
    return { type: 'solid', color: background.color };
  }
  return parseStoredBackground('{}');
}

function rowToStored(row: DbCustomPresetRow): StoredCustomPreset {
  const aspectRatio = parseStoredAspectRatio(row.aspect_ratio);
  const width = row.width ?? 1920;
  const height = row.height ?? 1080;
  const bg = parseStoredBackground(row.background);

  return {
    id: row.id,
    name: row.name,
    width,
    height,
    aspectRatio,
    style: {
      background: bg as BackgroundConfig,
      padding: row.padding,
      borderRadius: row.border_radius,
      shadow: parseStoredShadow(row.shadow),
    },
  };
}

export function storedToFramePreset(
  stored: StoredCustomPreset
): FramePreset & { style: CustomPresetStyle } {
  return {
    id: `custom-${stored.id}`,
    name: stored.name,
    category: 'custom',
    width: stored.width,
    height: stored.height,
    aspectRatio: stored.aspectRatio,
    style: stored.style,
  };
}

export async function listCustomPresets(): Promise<StoredCustomPreset[]> {
  await ensureMigrationsApplied();
  return (await dbPresetsList()).map(rowToStored);
}

export interface CreateCustomPresetInput {
  name: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  style: CustomPresetStyle;
}

export async function createCustomPreset(
  input: CreateCustomPresetInput
): Promise<StoredCustomPreset> {
  const parsed = createCustomPresetInputSchema.parse({
    ...input,
    name: input.name.trim(),
    style: {
      ...input.style,
      background: serializeBackground(input.style.background),
    },
  });

  await ensureMigrationsApplied();
  const id = await dbPresetsCreate({
    name: parsed.name,
    width: parsed.width,
    height: parsed.height,
    aspectRatio: parsed.aspectRatio,
    background: serializeStoredBackground(parsed.style.background),
    padding: parsed.style.padding,
    borderRadius: parsed.style.borderRadius,
    shadow: serializeStoredShadow(parsed.style.shadow),
  });

  return {
    id,
    name: parsed.name,
    width: parsed.width,
    height: parsed.height,
    aspectRatio: parsed.aspectRatio,
    style: parsed.style as CustomPresetStyle,
  };
}

export async function deleteCustomPreset(id: number): Promise<void> {
  await ensureMigrationsApplied();
  await dbPresetsDelete(id);
}

export function defaultCreateInputFromStyle(
  name: string,
  aspectRatio: AspectRatio,
  width: number,
  height: number,
  style: CustomPresetStyle
): CreateCustomPresetInput {
  return createCustomPresetInputSchema.parse({
    name: name.trim(),
    width,
    height,
    aspectRatio,
    style: {
      background: serializeBackground(style.background),
      padding: style.padding,
      borderRadius: style.borderRadius ?? DEFAULT_BORDER_RADIUS,
      shadow: style.shadow,
    },
  });
}
