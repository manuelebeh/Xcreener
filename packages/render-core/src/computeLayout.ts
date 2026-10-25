import { computeLayout as computeLayoutCore } from '@xcreener/editor-core';
import type { RenderInput } from './types';
import { toCoreRenderInput } from './types';

export function computeLayout(input: RenderInput) {
  return computeLayoutCore(toCoreRenderInput(input));
}
