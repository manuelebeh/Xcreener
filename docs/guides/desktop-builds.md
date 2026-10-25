# Desktop release builds

Build on the same OS as the target. Cross-compiling Windows from macOS is not supported here.

## macOS

```bash
mise run build:desktop:arm64   # Apple Silicon
mise run build:desktop:intel   # Intel
mise run build:desktop:mac     # both DMGs
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/*.dmg`

## Windows

Needs the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (WebView2, MSVC).

```bash
mise run build:desktop:windows
```

Output:

- `apps/desktop/src-tauri/target/release/bundle/msi/*.msi`
- `apps/desktop/src-tauri/target/release/bundle/nsis/*.exe`

## CI

Pushing a `v*` tag creates a draft GitHub Release with macOS (arm64 and x86_64) and Windows artifacts. Builds are unsigned until code-signing certificates are configured. See [release signing](release-signing.md).

## Tests

- Web smoke: `pnpm --filter @xcreener/desktop test:e2e`
- Native integration: `mise run test:e2e:native` (WebDriver on Linux and Windows, Rust tests on macOS)
- Rust unit tests: `cd apps/desktop/src-tauri && cargo test`

## Mobile

Expo development builds, not Expo Go. Needs Xcode (iOS) or Android Studio (Android).

```bash
mise run dev:mobile            # Metro dev client
mise run dev:mobile:ios        # first run does prebuild + simulator
mise run dev:mobile:android    # needs an emulator
```

Store builds and signing: [mobile signing](release-signing-mobile.md). Architecture rules: [`.cursor/rules/mobile-architecture.mdc`](../../.cursor/rules/mobile-architecture.mdc).
