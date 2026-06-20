export {
  autoFramePadding,
  autoPadding,
  computeLayout as computeLayoutCore,
  zoomTransformAtPointer,
} from '@snapglow/editor-core';
import { computeLayout as computeLayoutCore } from '@snapglow/editor-core';
import type { RenderInput } from '../types';
import { toCoreRenderInput } from '../types';

export function computeLayout(input: RenderInput) {
  return computeLayoutCore(toCoreRenderInput(input));
}
