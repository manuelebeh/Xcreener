import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ init: vi.fn(), close: vi.fn(async () => true) }));
const posthog = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
}));

vi.mock('@sentry/react', () => sentry);
vi.mock('posthog-js', () => ({ default: posthog }));

import {
  initObservability,
  resetObservabilityForTests,
  setObservabilityEnabled,
} from './observability';

describe('setObservabilityEnabled', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@sentry.test/1');
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test');
    vi.stubGlobal('window', {});
    resetObservabilityForTests();
    posthog.__loaded = false;
    vi.clearAllMocks();
  });

  it('stops Sentry and PostHog when the user opts out', async () => {
    initObservability(true);
    posthog.__loaded = true;

    await setObservabilityEnabled(false);

    expect(sentry.close).toHaveBeenCalled();
    expect(posthog.opt_out_capturing).toHaveBeenCalled();
  });

  it('starts again when the user opts back in', async () => {
    initObservability(true);
    posthog.__loaded = true;
    await setObservabilityEnabled(false);
    sentry.init.mockClear();

    await setObservabilityEnabled(true);

    expect(posthog.opt_in_capturing).toHaveBeenCalled();
    expect(sentry.init).toHaveBeenCalledTimes(1);
  });
});
