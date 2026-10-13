import type { ReactNode } from 'react';

const svgProps = {
  role: 'img',
  viewBox: '0 0 24 24',
  className: 'size-4',
  fill: 'currentColor',
} as const;

const ICONS: Record<string, ReactNode> = {
  twitter: (
    <svg aria-label="X" {...svgProps}>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    </svg>
  ),
  linkedin: (
    <svg aria-label="LinkedIn" {...svgProps}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  ),
  facebook: (
    <svg aria-label="Facebook" {...svgProps}>
      <path d="M13.5 22v-8.5h2.85l.45-3.4H13.5V7.95c0-.98.28-1.65 1.68-1.65H17V3.26C16.7 3.22 15.65 3.13 14.43 3.13c-2.56 0-4.31 1.56-4.31 4.43v2.54H7.2v3.4h2.92V22h3.38Z" />
    </svg>
  ),
  instagram: (
    <svg
      aria-label="Instagram"
      {...svgProps}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  ),
  youtube: (
    <svg aria-label="YouTube" {...svgProps}>
      <path
        fillRule="evenodd"
        d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8ZM10 15V9l5.2 3L10 15Z"
      />
    </svg>
  ),
};

/** Brand mark for a social preset id, or null when the preset has none. */
export function SocialIcon({ presetId }: { presetId: string }) {
  return ICONS[presetId] ?? null;
}
