---
paths:
  - "apps/mobile/**/*.{ts,tsx,js,jsx}"
---

# Mobile (Expo)

## Stack

- **Expo SDK 56** + Expo Router (file-based routing)
- **Expo docs (SDK 56):** [docs.expo.dev/versions/v56.0.0](https://docs.expo.dev/versions/v56.0.0/) — use this versioned reference for native modules, config plugins, and prebuild (not the unversioned “latest” docs)
- **Development builds only** — Share Extension / Share Intent require native code (`expo-dev-client`, not Expo Go)
- **State:** Zustand per module (`src/modules/`)
- **Design system:** `@snapglow/ui-native` + `@snapglow/design-tokens/tokens.native`
- **Lint / format:** Biome (same as desktop/web)

## Dev commands

```bash
mise run dev:mobile          # Metro dev client
mise run dev:mobile:ios      # Build & run iOS simulator (first run runs prebuild)
mise run dev:mobile:android  # Build & run Android emulator
```

First native run requires Xcode (iOS) or Android Studio (Android). After plugin or native module changes (e.g. `expo-share-intent`, `expo-media-library`, `snapglow-ocr`), rebuild with `mise run dev:mobile:ios` / `dev:mobile:android` (Metro alone does not link native modules).

When adding or upgrading Expo packages, prefer `npx expo install <pkg>` in `apps/mobile/` so versions stay aligned with SDK 56 (see [SDK 56 docs](https://docs.expo.dev/versions/v56.0.0/)).

## Project layout

```
apps/mobile/
├── app/                 # Expo Router screens
├── app.config.ts        # Expo config + share-intent plugin
├── eas.json             # EAS Build profiles (development / preview / production)
├── metro.config.js      # Monorepo workspace resolution
├── modules/snapglow-ocr/  # Local Expo module — Vision (iOS) + ML Kit (Android)
└── src/modules/
    ├── account/         # Auth0 sign-in (PKCE) + API-signed plan; free plans get the watermark
    ├── capture/         # Share import + image state (Sprint 1b.1)
    ├── cloud/           # Cloud library API client and hook
    ├── editor/          # Skia beautify, presets, annotations (Sprint 1b.2)
    ├── export/          # Full-res export, Photos save + share sheet (Sprint 1b.2–1b.3)
    └── redaction/       # On-device OCR scan + blur masking (Sprint 1b.3)
```

## Shared packages

| Package | Role |
|---------|------|
| `@snapglow/design-tokens` | SSOT — import `tokens.native` for RN theme |
| `@snapglow/editor-core` | Shared layout, presets, annotations (desktop + mobile) |
| `@snapglow/redaction-core` | On-device sensitive-data detectors + coordinate mapping |
| `@snapglow/ui-native` | RN components (Button, ThemeProvider) — sibling of web `@snapglow/ui` |

Do **not** import `@snapglow/ui` (web/Radix/Tailwind) in mobile code.

## Share import flow

1. User shares image from Photos / another app
2. `expo-share-intent` routes to main app via deep link
3. `useShareImport` stores image in `capture` Zustand store
4. App navigates to `/import` preview screen → user continues to `/editor`

## Export flow (Sprint 1b.2–1b.3)

1. **Full-res render (1b.3)** : offscreen `ExportCanvas` with `exportMode` — layout WYSIWYG, capped at 8192px **physical** per side (Metal limit ÷ device pixel ratio, e.g. ~2730pt on @3x)
2. Skia snapshot via `makeImageSnapshotAsync()` (textures GPU — `useImage`)
3. Encode PNG/JPG → base64 → write `documentDirectory` via `expo-file-system/legacy`
4. **Save to Photos** : `expo-media-library` permission write-only (`requestPermissionsAsync(true)`) + `saveToLibraryAsync` (legacy)
5. **Share** : iOS `Share.share({ url })` ; Android `expo-sharing` with `mimeType` / `UTI`
6. Simulateur iOS : logs `[Sharing] error fetching item…` possibles sans échec fonctionnel

## Module conventions

- Public API via `index.ts`; internal files colocated (`store.ts`, `hooks/`, `components/`)
- Path alias `@/` → `src/`
- Match desktop module naming where features align (`capture`, `editor`, …)

## UI polish

Use impeccable / taste skills for visual QA. Mobile uses StyleSheet + design tokens; no Tailwind on RN in Sprint 1b.1.
