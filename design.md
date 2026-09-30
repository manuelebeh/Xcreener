# Design - SnapGlow

Locked design system (pass 4, 2026-06-16). Agents and design skills (impeccable /
taste) read this file first; pages defer to it. Amend intentionally: the file is
the rule.

**SSOT in code:** `packages/design-tokens/tokens.json` → built to
`packages/design-tokens/dist/tokens.css` and `dist/tailwind-theme.css`.
Do not edit generated dist files; change `tokens.json` and run `mise run tokens:build`.

## System

- **Genre** · modern-minimal (utilitarian desktop tool)
- **Macrostructure** · Feature Stack - sticky canvas left, scrollable tools rail right
- **Nav** · N1b canonical inline - wordmark + inline links, active pill fill
- **Theme** · custom (vibe: "warm linen · amber primary · technical")
- **Axes** · light / mono-display / warm
- **Tone** · utilitarian - dense tool UI, honest copy, no decorative chrome

## Layout (desktop editor)

- **Shell** · top nav (`AppTopNav`) + routed main content
- **Editor** · `lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]`
  - Left: sticky canvas preview (`lg:sticky lg:top-4`)
  - Right: unified `EditorToolsPanel`, scrollable (`lg:max-h-[calc(100vh-5.5rem)]`)
- **Tool order** · Format → Style → Annotations → Sensitive data → **Export** (last)
- **Section labels** · `text-xs font-medium text-muted` - roman, vertical stack, no uppercase eyebrows
- **Container** · `max-w-7xl` editor, `max-w-5xl` history

## Typography

- **Body** · IBM Plex Sans (`--sg-font-family-sans` / `font-sans`)
- **Display / wordmark / page titles** · IBM Plex Mono (`font-display`, `--sg-font-family-display`)
- **Code / shortcuts** · IBM Plex Mono (`--sg-font-family-mono`)
- **Bundled via** · `@fontsource/ibm-plex-sans` + `@fontsource/ibm-plex-mono` in `global.css`
- **Headers** · always roman - no italic display type

## Tokens (canonical mapping)

Hallmark role → SnapGlow semantic token (light mode):

| Role | Token | OKLCH |
| --- | --- | --- |
| paper | `--sg-color-background` | oklch(0.99 0.004 70) |
| paper-2 | `--sg-color-surface` | oklch(0.97 0.006 70) |
| ink | `--sg-color-foreground` | oklch(0.20 0.010 52) |
| muted | `--sg-color-muted` | oklch(0.54 0.008 60) |
| rule | `--sg-color-border` | oklch(0.90 0.010 66) |
| accent | `--sg-color-primary` | oklch(0.54 0.12 60) |
| accent-ink | `--sg-color-primary-foreground` | oklch(0.99 0.004 70) |
| focus | `--sg-color-focus-ring` | oklch(0.54 0.12 60) |
| destructive | `--sg-color-destructive` | oklch(0.55 0.22 25) |
| success | `--sg-color-success` | oklch(0.48 0.12 145) |

## CTA voice

- **Primary** · `bg-primary text-primary-foreground` · `rounded-md` · opacity hover
- **Secondary** · `bg-surface border-border` · same radius
- **Ghost** · transparent · hover `bg-surface`
- **Destructive** · `bg-destructive` · confirm via deferred delete + undo, never `window.confirm`
- **Labels** · verb-first ("Save preset", "Check for updates") · async states swap label text

## Interaction

- **Focus** · `.sg-focus-ring` utility + `@snapglow/ui` `focusRingClasses` on shared components
- **Delete** · optimistic remove + 8s undo toast (history captures, custom presets)
- **Tooltips** · 800ms hover delay · silent success preferred over celebratory toasts
- **Motion** · motion-cut · `transition-colors` / `transition-opacity` only · no layout animation
- **Reduced motion** · ≤150ms opacity crossfade
- **Capture HUD** · `.capture-hud` classes - semantic tokens via `color-mix`, not raw Tailwind neutrals

## Exports

### 1 · `tokens.css` (source of truth)

See `packages/design-tokens/dist/tokens.css`. Key semantic block:

```css
:root {
  --sg-color-background: oklch(0.99 0.004 70);
  --sg-color-foreground: oklch(0.20 0.010 52);
  --sg-color-muted: oklch(0.54 0.008 60);
  --sg-color-border: oklch(0.90 0.010 66);
  --sg-color-primary: oklch(0.54 0.12 60);
  --sg-color-primary-foreground: oklch(0.99 0.004 70);
  --sg-color-surface: oklch(0.97 0.006 70);
  --sg-color-destructive: oklch(0.55 0.22 25);
  --sg-color-success: oklch(0.48 0.12 145);
  --sg-color-focus-ring: oklch(0.54 0.12 60);

  --sg-font-family-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --sg-font-family-display: 'IBM Plex Mono', ui-monospace, monospace;
  --sg-font-family-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --sg-radius-sm: 0.25rem;
  --sg-radius-md: 0.375rem;
  --sg-radius-lg: 0.5rem;
  --sg-radius-xl: 0.75rem;
}
```

### 2 · Tailwind v4 `@theme`

See `packages/design-tokens/dist/tailwind-theme.css`. Consumed by desktop via
`@snapglow/ui/styles.css`. Utilities: `bg-primary`, `text-muted`, `font-display`, `font-mono`, etc.

### 3 · DTCG `tokens.json`

See `packages/design-tokens/tokens.json` - full brand scale, neutrals, semantic
aliases, spacing, radius, typography. Do not duplicate here; edit that file.

### 4 · shadcn/ui CSS variables (OKLCH triples)

```css
:root {
  --background:           99%   0.004 70;
  --foreground:           20%   0.010 52;
  --card:                 97%   0.006 70;
  --card-foreground:      20%   0.010 52;
  --primary:              54%   0.12  60;
  --primary-foreground:   99%   0.004 70;
  --secondary:            97%   0.006 70;
  --secondary-foreground: 20%   0.010 52;
  --muted:                90%   0.010 66;
  --muted-foreground:     54%   0.008 60;
  --destructive:          55%   0.22  25;
  --border:               90%   0.010 66;
  --input:                90%   0.010 66;
  --ring:                 54%   0.12  60;
  --radius:               0.375rem;
}
```

## Notes

- Gradient presets in `gradients.ts` are curated warm/neutral - avoid reintroducing
  template-neon stops (`#667eea`, `#c471f5`, pure `#000000`).
- Canvas/render engine may use raw hex for `<input type="color">` - acceptable;
  React chrome must stay on semantic tokens.
- Visual diversification is **inverted** while this file exists: new pages share
  this system; amend `design.md` for intentional variants, don't override locally.
