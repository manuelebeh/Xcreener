# Accessibility audit - SnapGlow design system (WCAG 2.1 AA)

**Date:** 2026-06-16  
**Sprint:** 0.4 (P0-020)  
**Scope:** `packages/ui` components + desktop Settings consumption

## Tooling

| Tool | Status |
|------|--------|
| `@storybook/addon-a11y` | Enabled in Storybook (`mise run storybook`) |
| Biome a11y rules | Enabled via `@snapglow/biome-config` |
| Automated contrast validation | Manual review (OKLCH pairs documented below) |

## Component audit

| Component | WCAG criterion | Finding | Fix applied |
|-----------|----------------|---------|-------------|
| **Button** | 2.4.7 Focus Visible | Outline used `primary` inconsistently | Shared `focusRingClasses` token (`focus-ring`) |
| **Input** | 3.3.1 Error Identification | No `aria-invalid` pattern in kit | `aria-invalid` border styling; Settings wires `aria-describedby` |
| **Select** | 1.3.1 Info & Relationships | Missing Storybook coverage | Added `Select.stories.tsx` with labelled example |
| **Slider** | 2.4.7 Focus Visible | Thumb outline inconsistent | Uses shared `focusRingClasses` |
| **Dropdown** | 2.4.7 Focus Visible | Items used `outline-none` only | Visible focus ring on menu items |
| **Tooltip** | 2.3.3 Animation | No reduced-motion guard | `motion-safe:` animation classes + global `prefers-reduced-motion` in `globals.css` |
| **Label** | 1.3.1 Info & Relationships | No shared label primitive | Added `Label` component |
| **ThemeProvider** | 1.4.3 Contrast (Minimum) | Dark mode semantic pairs unverified | Documented pairs below; Storybook preview wraps `ThemeProvider` |

## Semantic color pairs (contrast)

| Pair | Light | Dark | Notes |
|------|-------|------|-------|
| `foreground` / `background` | neutral.900 on neutral.0 | neutral.50 on neutral.950 | Body text - AA large+ |
| `primary` / `primary-foreground` | brand.500 on neutral.0 | brand.400 on neutral.950 | Buttons - AA for text |
| `muted` / `background` | neutral.500 on neutral.0 | neutral.400 on neutral.950 | Helper text - AA for small text on light; verify in product UI |
| `destructive` / `primary-foreground` | oklch red on white | lighter red on dark bg | Error states |

**Follow-up (Phase 1):** run automated contrast checks when Figma tokens (P0-008) land.

## Desktop Settings (consumer)

| Area | Fix |
|------|-----|
| Shortcut error | `aria-invalid`, `aria-describedby`, `role="alert"` on error message |
| Hint text | Stable `id="capture-shortcut-hint"` for description |

## Validation checklist

- [x] Storybook a11y addon installed and configured
- [x] Focus ring token added to `packages/design-tokens`
- [x] All interactive components use shared focus ring
- [x] `prefers-reduced-motion` respected globally
- [x] Settings shortcut field accessible error association
- [ ] Full axe CI gate (deferred - addon manual review sufficient for Phase 0)

## References

- [ADR-002](../architecture/adr/002-design-tokens-ui-and-web.md)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
