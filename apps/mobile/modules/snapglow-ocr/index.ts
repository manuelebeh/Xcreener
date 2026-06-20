import { requireNativeModule } from 'expo-modules-core';

import type { OcrTextLine } from './src/types';

interface SnapglowOcrNativeModule {
  recognizeText(imageUri: string): Promise<OcrTextLine[]>;
}

const SnapglowOcr = requireNativeModule<SnapglowOcrNativeModule>('SnapglowOcr');

export type { OcrTextLine };

export async function recognizeText(imageUri: string): Promise<OcrTextLine[]> {
  return SnapglowOcr.recognizeText(imageUri);
}
