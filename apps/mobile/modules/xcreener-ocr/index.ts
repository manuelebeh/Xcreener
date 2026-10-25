import { requireNativeModule } from 'expo-modules-core';

import type { OcrTextLine } from './src/types';

interface XcreenerOcrNativeModule {
  recognizeText(imageUri: string): Promise<OcrTextLine[]>;
}

const XcreenerOcr = requireNativeModule<XcreenerOcrNativeModule>('XcreenerOcr');

export type { OcrTextLine };

export async function recognizeText(imageUri: string): Promise<OcrTextLine[]> {
  return XcreenerOcr.recognizeText(imageUri);
}
