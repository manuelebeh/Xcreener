# Design - SnapGlow

Desktop redesign locked 2026-10-13: the category standard, executed with care.
Agents and design skills (impeccable / taste) read this file first; pages defer
to it. Amend intentionally: the file is the rule.

**Scope:** this describes the desktop app (`apps/desktop`). Web and mobile still
use the shared amber tokens below until they are redesigned.

**Product truth:** `apps/desktop/PRODUCT.md`. **Direction contract:**
`apps/desktop/.impeccable/surfaces/src-main-tsx.md`.

**SSOT in code (desktop):** `apps/desktop/src/styles/theme.css`. It overrides the
shared tokens from `packages/design-tokens/tokens.json` for this app only
(`--color-*`, `--sg-color-*`, fonts, radii, neutral scale).

## System

- **Genre** · category standard for photo and screenshot editors (CleanShot X, Pixelmator Pro, Shottr)
- **Constraint** · stay close to what users already know; no experimental metaphors
- **Mode** · Operate: the image is the subject, chrome recedes
- **Theme** · follows the system, light and dark both designed
- **Tone** · utilitarian, dense, honest copy, no decorative chrome

## Layout

- **Window** · full-height, no page scroll; default 1120x740, minimum 900x600
- **Toolbar** · `AppTopNav`: wordmark left, segmented Editor / Library / Settings centered, New capture (Tauri only) and notifications right
- **Editor** · two columns: stage left, 320 to 340px inspector right
  - Stage: persistent annotation tool strip (tools, undo, redo; Collaborate popover on the right when signed in to the cloud) on top, capture centered on a darker neutral, status bar below (preset, size, Fit %)
  - Inspector: scrolling collapsible sections, **Export pinned at the foot** and never collapsible
- **Inspector order** · suggestion banner (only when present) → Annotation options (only when the blur tool or a shape is selected) → Format → Style (Balance "Equal margins" sits under Padding) → Text (copy text, then Sensitive data) → Export
- **No placeholder sections** · a section with nothing to act on is not rendered; actions about sharing rather than the image (collaboration, comments) live in the stage tool strip, not the inspector
- **Empty state** · no capture: inspector shows one line of guidance, no empty sections
- **Library / Settings** · scroll inside the window; Library uses a `max-w-5xl` column, Settings a centered `max-w-2xl` column where every section is a `SettingsGroup` (`@/shared/components/SettingsGroup`): 12px label outside, one bordered card of rows (label left, control right)

## Typography

- **All text** · system sans (`-apple-system`, SF Pro, Segoe UI); no bundled web fonts
- **Code / shortcuts** · system mono
- **Scale** · 12px section labels and hints, 13px controls, 14px body rows, 20px page titles
- **Numerals** · `tabular-nums` on live values (sliders, sizes, percentages)

## Tokens (desktop overrides)

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| window | `--sg-color-background` | oklch(0.965 0.002 260) | oklch(0.22 0.005 260) |
| panel | `--sg-color-surface` | oklch(0.99 0.001 260) | oklch(0.26 0.006 260) |
| stage | `--app-stage` | oklch(0.9 0.004 260) | oklch(0.17 0.004 260) |
| ink | `--sg-color-foreground` | oklch(0.22 0.01 260) | oklch(0.95 0.003 260) |
| muted | `--sg-color-muted` | oklch(0.5 0.01 260) | oklch(0.72 0.008 260) |
| rule | `--sg-color-border` | oklch(0.88 0.004 260) | oklch(0.34 0.006 260) |
| accent | `--sg-color-primary` | oklch(0.55 0.19 258) | oklch(0.68 0.16 255) |
| destructive | `--sg-color-destructive` | oklch(0.55 0.2 25) | oklch(0.68 0.19 25) |
| success | `--sg-color-success` | oklch(0.5 0.13 150) | oklch(0.7 0.13 150) |

Radius: 6px controls, 10px panels. Hairlines 1px. One accent (blue) for selection and the primary action.

## Controls

- **Height** · 32px for buttons (`sm`), selects and text inputs; the primary Export button shares that row height
- **Selects** · native element, `appearance: none` with a drawn chevron (theme.css)
- **Segmented** · `@/shared/components/Segmented` for mutually exclusive modes
- **Inspector rhythm** · label to its control 6px (`space-y-1.5`), controls inside a group 16px (`space-y-4`), groups and their hairline 20px on both sides (`space-y-5`, `pt-5`), a note under its control 4 to 8px. Color inputs are 32 x 48px, like buttons and selects
- **Slider rows** · `@/shared/components/SliderField`: label left, live value right, slider below
- **Primary** · `bg-primary text-primary-foreground`; Secondary · `bg-surface border-border`; Ghost · transparent
- **Destructive** · deferred delete with undo toast, never `window.confirm`
- **Labels** · verb-first ("Save shortcut", "Check for updates")

## Interaction

- **Focus** · `.sg-focus-ring` utility and `@snapglow/ui` `focusRingClasses`
- **Tooltips** · 800ms hover delay; silent success preferred over celebratory toasts
- **Motion** · `transition-colors` / `transition-opacity` only, no layout animation; reduced motion handled globally
- **Capture HUD** · `.capture-hud` classes, semantic tokens through `color-mix`, cool neutral scale from theme.css

## Known gaps

- Capture overlay layout and `HistoryPreview` have not been restyled or reviewed. Team workspace sub-panels (members, brand kit, billing, API keys, usage) sit inside a `SettingsGroup` card but keep their old inner layout.
- Shortcut field shows the raw Tauri format; a key recorder is not built.
- No zoom control: the preview fits the window (status bar shows Fit %).
- `.impeccable/design.json` has not been generated for this system.

## Shared tokens (web and mobile, unchanged)


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
