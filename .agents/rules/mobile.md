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

First native run requires Xcode (iOS) or Android Studio (Android). After plugin changes (e.g. `expo-share-intent`, `expo-media-library`), rebuild with `mise run dev:mobile:ios` / `dev:mobile:android` (Metro seul ne met pas à jour Info.plist).

When adding or upgrading Expo packages, prefer `npx expo install <pkg>` in `apps/mobile/` so versions stay aligned with SDK 56 (see [SDK 56 docs](https://docs.expo.dev/versions/v56.0.0/)).

## Project layout

```
apps/mobile/
├── app/                 # Expo Router screens
├── app.config.ts        # Expo config + share-intent plugin
├── metro.config.js      # Monorepo workspace resolution
└── src/modules/
    ├── capture/         # Share import + image state (Sprint 1b.1)
    ├── editor/          # Skia beautify, presets, annotations (Sprint 1b.2)
    └── export/          # Photos save + share sheet (Sprint 1b.2)
```

## Shared packages

| Package | Role |
|---------|------|
| `@snapglow/design-tokens` | SSOT — import `tokens.native` for RN theme |
| `@snapglow/editor-core` | Shared layout, presets, annotations (desktop + mobile) |
| `@snapglow/ui-native` | RN components (Button, ThemeProvider) — sibling of web `@snapglow/ui` |

Do **not** import `@snapglow/ui` (web/Radix/Tailwind) in mobile code.

## Share import flow

1. User shares image from Photos / another app
2. `expo-share-intent` routes to main app via deep link
3. `useShareImport` stores image in `capture` Zustand store
4. App navigates to `/import` preview screen → user continues to `/editor`

## Export flow (Sprint 1b.2)

1. Skia canvas snapshot via `makeImageSnapshotAsync()` (textures GPU — `useImage`)
2. Encode PNG/JPG → base64 → write `documentDirectory` via `expo-file-system/legacy`
3. **Save to Photos** : `expo-media-library` permission write-only (`requestPermissionsAsync(true)`) + `saveToLibraryAsync` (legacy)
4. **Share** : iOS `Share.share({ url })` ; Android `expo-sharing` with `mimeType` / `UTI`
5. Simulateur iOS : logs `[Sharing] error fetching item…` possibles sans échec fonctionnel

## Module conventions

- Public API via `index.ts`; internal files colocated (`store.ts`, `hooks/`, `components/`)
- Path alias `@/` → `src/`
- Match desktop module naming where features align (`capture`, `editor`, …)

## UI polish

Use Hallmark skill for visual QA. Mobile uses StyleSheet + design tokens — no Tailwind on RN in Sprint 1b.1.
