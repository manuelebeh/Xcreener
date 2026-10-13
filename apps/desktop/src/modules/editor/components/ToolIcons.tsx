import type { ReactNode } from 'react';
import type { EditorTool } from '../annotations/types';

const paths: Record<EditorTool, ReactNode> = {
  select: <path d="M5 3.5 15 9l-4.4 1.2L8.8 15 5 3.5Z" />,
  move: (
    <>
      <path d="M10 3v14M3 10h14" />
      <path d="m7.5 5.5 2.5-2.5 2.5 2.5M7.5 14.5l2.5 2.5 2.5-2.5M5.5 7.5 3 10l2.5 2.5M14.5 7.5 17 10l-2.5 2.5" />
    </>
  ),
  text: <path d="M4.5 5.5v-1.5h11v1.5M10 4v12M8 16h4" />,
  rect: <rect x="3.5" y="5" width="13" height="10" rx="1.5" />,
  ellipse: <ellipse cx="10" cy="10" rx="6.5" ry="5" />,
  arrow: <path d="M4 16 16 4M8.5 4H16v7.5" />,
  line: <path d="M4 16 16 4" />,
  highlight: (
    <>
      <path d="m4 14.5 7.5-7.5 3 3L7 17.5H4v-3Z" />
      <path d="m11.5 7 1.5-1.5 3 3L14.5 10" />
    </>
  ),
  blur: (
    <>
      <circle cx="7" cy="7" r="1" />
      <circle cx="13" cy="7" r="1" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="7" cy="13" r="1" />
      <circle cx="13" cy="13" r="1" />
    </>
  ),
};

export function ToolIcon({ tool }: { tool: EditorTool }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[tool]}
    </svg>
  );
}
