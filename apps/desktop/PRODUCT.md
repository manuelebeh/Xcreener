# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two profiles share one app. Everyday capturers (developers, PMs, support) need a fast capture, light annotation, redaction of sensitive data, then a share. Content creators (posts, landing pages, tutorials) need beautified screenshots and spend real time in the editor. The same app serves a 30-second pass and a long polish session.

## Product Purpose
SnapGlow is a privacy-first desktop app: capture, beautify, share. It lives in the menu bar and opens its main window from the tray. Local-first; cloud links only on explicit user action. Success: a user goes from capture to a shareable, good-looking image without leaving the app.

## Positioning
Privacy-first screenshot tool: no telemetry, no upload without an explicit action, on-device redaction and OCR.

## Operating Context
Tauri 2 desktop app (macOS first, also Windows and Linux builds) with a React frontend, Tailwind v4 and shared packages (`@snapglow/ui`, `design-tokens`, `editor-core`). A transparent always-on-top overlay window handles region, window and screen capture and recording. Main window routes: editor (`/`), history (`/history`), settings (`/settings`).

## Capabilities and Constraints
Modules in the app: capture (photo, region recording, scrolling capture), editor (padding, background, radius, shadow, presets, annotations, transform), redaction of sensitive data, text extraction (OCR), balance (equal margins), style suggestion, export and compression, history, cloud shares, collab, team, integrations, marketplace, licensing, settings. The redesign changes look and screen structure for the desktop app only; web, mobile and shared packages are out of scope for now. Functions, routes and i18n keys exist today; whether any must stay untouched is undecided (user answer: nothing is pinned, everything is open).

## Brand Commitments
The name SnapGlow, the current warm-amber OKLCH palette and IBM Plex type are evidence, not constraints. Binding (user, 2026-10-13): the redesign must stay close to category standards so existing users keep their habits. Screen structure and interaction follow familiar photo and screenshot editors (top toolbar, centered canvas, grouped right inspector, status bar). No experimental metaphors or unconventional navigation.

## Evidence on Hand
Existing design system in `/DESIGN.md` and `packages/design-tokens/tokens.json`. Product specs in `docs/internal/product/`. No testimonials, customer numbers or benchmarks on hand; none may be invented.

## Product Principles
1. The image is the subject; interface chrome recedes while editing.
2. Fast path first: capture to share in few steps, depth available but not in the way.
3. Privacy is visible in the interface, not only promised in copy.
4. One app, two paces: the same screens serve a quick pass and a long polish.

## Accessibility & Inclusion
No product-specific standard established. Keyboard focus and reduced motion are already handled in the current system and should not regress.
