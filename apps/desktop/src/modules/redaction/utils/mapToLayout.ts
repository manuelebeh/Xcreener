import type { SensitiveRegion } from '@xcreener/redaction-core';
import { mapRegionToLayout as mapRegionToLayoutCore } from '@xcreener/redaction-core';
import type { RenderInput } from '@/modules/editor/types';
import { toCoreRenderInput } from '@/modules/editor/types';

export function mapRegionToLayout(region: SensitiveRegion, input: RenderInput) {
  return mapRegionToLayoutCore(region, toCoreRenderInput(input));
}
