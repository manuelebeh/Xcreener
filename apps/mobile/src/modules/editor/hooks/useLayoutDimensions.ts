import { computeLayout } from '@xcreener/editor-core';
import { useMemo } from 'react';

import type { MobileRenderInput } from './useMobileRenderInput';

export function useLayoutDimensions(input: MobileRenderInput | null) {
  return useMemo(() => (input ? computeLayout(input) : null), [input]);
}
