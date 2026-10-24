# Native E2E (WebDriver + tauri-driver)

Automated integration tests for tray-adjacent behaviour and global shortcuts.

## Platform support

| Platform | WebDriver (`tauri-driver`) | What runs locally |
|----------|---------------------------|-------------------|
| **Linux** | Supported (WebKitWebDriver) | Full native e2e |
| **Windows** | Supported (msedgedriver) | Full native e2e |
| **macOS** | **Not supported** by Tauri | `cargo test` + manual tray QA |

Tauri documents this limitation: [WebDriver testing](https://v2.tauri.app/develop/tests/webdriver/) - macOS has no WKWebView WebDriver.

## Run locally

### macOS

```bash
# Full pipeline (debug build + Rust tests - no WebDriver)
mise run test:e2e:native

# Or after a debug build:
cd apps/desktop && pnpm test:e2e:native
```

### Linux / Windows

```bash
cargo install tauri-driver --locked

# Linux also needs:
# sudo apt install webkit2gtk-driver xvfb

# Windows also needs msedgedriver on PATH - see Tauri docs

mise run test:e2e:native
```

## Manual QA (macOS tray - not automatable with tauri-driver)

- [ ] Tray icon visible in menu bar
- [ ] Left click toggles window show/hide
- [ ] Context menu: Open, Settings, Quit
- [ ] Settings menu item navigates to Settings view
- [ ] Global shortcut fires capture stub when app is in background

## IPC test hooks (debug builds)

Used by WebDriver tests on Linux/Windows:

| Command | Purpose |
|---------|---------|
| `e2e_show_main_window` | Show/focus main window before WebDriver steps |
| `e2e_emit_capture_triggered` | Simulate global shortcut without OS key injection |
| `e2e_hide_main_window` | Hide window (close-button behaviour) |
| `e2e_inject_screenshot` | Inject PNG bytes into editor via `capture-image` event |
| `e2e_temp_export_path` | File path under `$APPDATA` for export assertions |
| `e2e_file_metadata` | Check exported file exists + size |

Spec `e2e-native/specs/capture-beautify-export.spec.ts` : inject PNG → editor → export PNG (full beautify pipeline without OS capture).

## CI

- **ubuntu-22.04 + windows-latest**: full WebDriver suite
- **macos-latest**: debug build + `cargo test` (shortcuts parsing)
