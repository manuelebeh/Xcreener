import { describe, expect, it } from 'vitest';
import { deepLinkRoute } from './deepLink';

describe('deepLinkRoute', () => {
  it('reads the route from a snapglow URL', () => {
    expect(deepLinkRoute(new URL('snapglow://auth/callback?code=1'))).toBe('auth/callback');
    expect(deepLinkRoute(new URL('snapglow://integrations/callback/'))).toBe(
      'integrations/callback'
    );
  });

  it('ignores other schemes', () => {
    expect(deepLinkRoute(new URL('https://auth/callback'))).toBeNull();
  });
});
