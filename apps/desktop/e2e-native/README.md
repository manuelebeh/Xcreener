# Native E2E (WebDriver + tauri-driver)

Automated integration tests for tray-adjacent behaviour and global shortcuts (via IPC test hooks).

## Prerequisites

```bash
cargo install tauri-driver --locked
mise run tokens:build
pnpm --filter @snapglow/desktop tauri build --debug
```

## Run locally

```bash
# Terminal 1
tauri-driver

# Terminal 2
pnpm --filter @snapglow/desktop test:e2e:native
```

Or use the bundled script (starts driver, runs tests, stops driver):

```bash
pnpm --filter @snapglow/desktop test:e2e:native:ci
```

## Manual QA (tray — not automatable in CI)

- [ ] Tray icon visible in menu bar / system tray
- [ ] Left click toggles window show/hide
- [ ] Context menu: Open, Settings, Quit
- [ ] Settings menu item navigates to Settings view
- [ ] Global shortcut fires capture stub when app is in background

## IPC test hooks (debug builds only)

| Command | Purpose |
|---------|---------|
| `e2e_show_main_window` | Show/focus main window before WebDriver steps |
| `e2e_emit_capture_triggered` | Simulate global shortcut without OS key injection |
| `e2e_hide_main_window` | Hide window (close-button behaviour) |
| `e2e_is_main_window_visible` | Assert visibility state |
