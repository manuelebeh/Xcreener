import Database from '@tauri-apps/plugin-sql';
import type { CustomPresetStyle } from '@/modules/editor/store';
import type { AspectRatio, BackgroundConfig, FramePreset } from '@/modules/editor/types';
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

const DB_URL = 'sqlite:snapglow.db';

let dbPromise: Promise<Database> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

interface CustomPresetRow {
  id: number;
  name: string;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  background: string;
  padding: number;
  border_radius: number;
  shadow: string;
}

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

function rowToStored(row: CustomPresetRow): StoredCustomPreset {
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
  const db = await getDb();
  const rows = await db.select<CustomPresetRow[]>(
    `SELECT id, name, width, height, aspect_ratio, background, padding, border_radius, shadow
     FROM custom_presets ORDER BY created_at DESC`
  );
  return rows.map(rowToStored);
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

  const db = await getDb();
  const background = serializeStoredBackground(parsed.style.background);
  const shadow = serializeStoredShadow(parsed.style.shadow);

  const result = await db.execute(
    `INSERT INTO custom_presets (name, width, height, aspect_ratio, background, padding, border_radius, shadow)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.name,
      parsed.width,
      parsed.height,
      parsed.aspectRatio,
      background,
      parsed.style.padding,
      parsed.style.borderRadius,
      shadow,
    ]
  );

  const id =
    result.lastInsertId ??
    (await db.select<{ id: number }[]>('SELECT id FROM custom_presets ORDER BY id DESC LIMIT 1'))[0]
      ?.id;

  if (id === undefined) {
    throw new Error('Failed to create custom preset');
  }

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
  const db = await getDb();
  await db.execute('DELETE FROM custom_presets WHERE id = ?', [id]);
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
