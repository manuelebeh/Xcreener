import { describe, expect, it } from 'vitest';
import {
  defaultCollabDocumentState,
  isCollabClientMessage,
  parseMentionEmails,
  participantColor,
} from './index';

describe('collab-core', () => {
  it('parses mention emails from comment body', () => {
    expect(parseMentionEmails('Hey @alice@test.com and @bob@test.com')).toEqual([
      'alice@test.com',
      'bob@test.com',
    ]);
    expect(parseMentionEmails('no mentions')).toEqual([]);
  });

  it('returns stable participant colors', () => {
    const a = participantColor('user-1');
    const b = participantColor('user-1');
    const c = participantColor('user-2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('validates client messages', () => {
    expect(isCollabClientMessage({ type: 'ping' })).toBe(true);
    expect(isCollabClientMessage({ type: 'auth', token: 't', documentId: 'd' })).toBe(true);
    expect(isCollabClientMessage({ type: 'unknown' })).toBe(false);
    expect(isCollabClientMessage(null)).toBe(false);
  });

  it('builds default document state', () => {
    const state = defaultCollabDocumentState(800, 600);
    expect(state.screenshotWidth).toBe(800);
    expect(state.annotations).toEqual([]);
  });
});
