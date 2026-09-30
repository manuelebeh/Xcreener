import { describe, expect, it } from 'vitest';
import { createTemplateSubmissionSchema, slugifyTemplateTitle, templateStyleSchema } from './index';

describe('marketplace-core', () => {
  it('validates template style', () => {
    const style = templateStyleSchema.parse({
      background: { type: 'gradient', presetId: 'midnight-code' },
      padding: 32,
      borderRadius: 12,
      shadow: { opacity: 0.3, blur: 24, offsetX: 0, offsetY: 8, color: '#000' },
      frame: null,
    });
    expect(style.padding).toBe(32);
  });

  it('slugifies titles', () => {
    expect(slugifyTemplateTitle('Dark Code Theme!')).toBe('dark-code-theme');
  });

  it('validates submission input', () => {
    const input = createTemplateSubmissionSchema.parse({
      title: 'Minimal Light',
      style: {
        background: { type: 'solid', color: '#fff' },
        padding: 24,
        borderRadius: 8,
        shadow: { opacity: 0.2, blur: 16, offsetX: 0, offsetY: 4, color: '#000' },
        frame: null,
      },
      tags: ['minimal'],
    });
    expect(input.title).toBe('Minimal Light');
  });
});
