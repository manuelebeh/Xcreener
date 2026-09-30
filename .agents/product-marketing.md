# Product marketing context

*Last updated: 2026-09-30*

## Product overview

**One-liner:** SnapGlow is a privacy-first screenshot app: capture, beautify, and share. Local-first; optional cloud links.

**What it does:** Capture screens (zone / window / display), beautify with presets and annotations, redact sensitive content on-device, and export or share. Desktop (Tauri) is the primary surface; companion mobile (Expo), landing + public share viewer (TanStack Start), and optional Fastify cloud API for links and teams.

**Category:** Screenshot / screen capture · image beautification · privacy tools

**Product type:** Desktop app + mobile companion + optional cloud SaaS

**ICP:** People who share screenshots for work or content (developers, designers, support, creators) and want polish without uploading everything by default.

## Positioning

- Local-first capture and edit; cloud only when the user chooses to share.
- Shared editor / redaction cores across desktop and mobile.
- Design system locked in root `design.md`; tokens in `packages/design-tokens`.

## Surfaces

| Surface | Role |
|---------|------|
| Desktop | Full capture → edit → export / share |
| Web | Marketing landing + `/s/:token` share viewer |
| Mobile | Import / edit / export companion |
| API | Auth0 shares, library, teams (optional cloud) |

## Voice

Calm, precise, trustworthy. Privacy claims must match product behavior. No surveillance framing.
