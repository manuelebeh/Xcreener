import type { StyleSuggestion } from '@snapglow/style-suggestion-core';
import { useEditorStore } from '@/modules/editor/store';
import type { BackgroundConfig } from '@/modules/editor/types';
import { createBlurredScreenshotBackground } from './blurredScreenshotBackground';

async function resolveBackground(
  suggestion: StyleSuggestion,
  screenshot: ImageBitmap
): Promise<BackgroundConfig> {
  const { background } = suggestion;

  if (background.type === 'gradient') {
    return { type: 'gradient', presetId: background.presetId };
  }

  if (background.type === 'solid') {
    return { type: 'solid', color: background.color };
  }

  const blurred = await createBlurredScreenshotBackground(screenshot);
  return { type: 'image', source: blurred };
}

export async function applySuggestedStyle(suggestion: StyleSuggestion): Promise<void> {
  const { screenshot, updateBackground, setPadding, setBorderRadius, updateShadow } =
    useEditorStore.getState();

  if (!screenshot) {
    return;
  }

  const background = await resolveBackground(suggestion, screenshot);

  setPadding(suggestion.padding);
  updateBackground(background);
  setBorderRadius(suggestion.borderRadius);
  updateShadow(suggestion.shadow);
}
