import { describe, expect, it } from 'vitest';
import {
  INTEGRATION_LABELS,
  INTEGRATION_PROVIDERS,
  INTEGRATION_SCOPES,
  isIntegrationProvider,
} from './index';

describe('integrations-core', () => {
  it('defines providers with labels and scopes', () => {
    expect(INTEGRATION_PROVIDERS).toEqual([
      'slack',
      'notion',
      'linear',
      'github',
      'jira',
      'confluence',
      'msteams',
    ]);
    for (const provider of INTEGRATION_PROVIDERS) {
      expect(INTEGRATION_LABELS[provider]).toBeTruthy();
      expect(INTEGRATION_SCOPES[provider]).toBeTruthy();
    }
  });

  it('validates provider ids', () => {
    expect(isIntegrationProvider('slack')).toBe(true);
    expect(isIntegrationProvider('unknown')).toBe(false);
  });
});
