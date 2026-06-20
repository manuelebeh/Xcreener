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

First native run requires Xcode (iOS) or Android Studio (Android). After plugin changes (e.g. `expo-share-intent`), rebuild with `expo run:ios` / `expo run:android`.

When adding or upgrading Expo packages, prefer `npx expo install <pkg>` in `apps/mobile/` so versions stay aligned with SDK 56 (see [SDK 56 docs](https://docs.expo.dev/versions/v56.0.0/)).

## Project layout

```
apps/mobile/
├── app/                 # Expo Router screens
├── app.config.ts        # Expo config + share-intent plugin
├── metro.config.js      # Monorepo workspace resolution
└── src/modules/
    └── capture/         # Share import + image state (Sprint 1b.1)
```

## Shared packages

| Package | Role |
|---------|------|
| `@snapglow/design-tokens` | SSOT — import `tokens.native` for RN theme |
| `@snapglow/ui-native` | RN components (Button, ThemeProvider) — sibling of web `@snapglow/ui` |

Do **not** import `@snapglow/ui` (web/Radix/Tailwind) in mobile code.

## Share import flow

1. User shares image from Photos / another app
2. `expo-share-intent` routes to main app via deep link
3. `useShareImport` stores image in `capture` Zustand store
4. App navigates to `/import` preview screen

## Module conventions

- Public API via `index.ts`; internal files colocated (`store.ts`, `hooks/`, `components/`)
- Path alias `@/` → `src/`
- Match desktop module naming where features align (`capture`, `editor`, …)

## UI polish

Use Hallmark skill for visual QA. Mobile uses StyleSheet + design tokens — no Tailwind on RN in Sprint 1b.1.
