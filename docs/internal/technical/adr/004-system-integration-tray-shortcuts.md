# ADR-004 — System integration: tray, shortcuts, autostart

**Status:** Accepted  
**Date:** 2026-06-16  
**Sprint:** 0.4

## Context

SnapGlow runs as a menu-bar / system-tray utility. Users expect show/hide from the tray, a global capture shortcut, and optional launch-at-login. Sprint 0.3 implemented these; Sprint 0.4 documents the architecture and test strategy.

## Decision

### Tray (`src-tauri/src/tray.rs`)

- **Icon:** app default window icon via `TrayIconBuilder`.
- **Left click:** toggle main window show/hide.
- **Context menu:** Open, Settings (emits `navigate-settings` + show), Quit.
- **Close button:** `CloseRequested` → `prevent_close()` + `hide()` — app stays in tray.

### Global shortcuts (`src-tauri/src/shortcuts.rs`)

- Plugin: `tauri-plugin-global-shortcut`.
- Default: `CmdOrControl+Shift+KeyS` (`DEFAULT_CAPTURE_SHORTCUT`).
- State: `CaptureShortcutState` mutex holds current shortcut string.
- Registration: unregister previous → register new on change via `update_capture_shortcut` command.
- On press: emit `capture-triggered` with `{ source: "shortcut" }`.

Frontend: `useGlobalShortcut` listens for the event; Settings persists shortcut in SQLite.

### Autostart (`tauri-plugin-autostart`)

- macOS: `MacosLauncher::LaunchAgent`.
- Synced from Settings via `modules/settings/autostart.ts` on toggle and bootstrap.

### Capabilities

`capabilities/default.json` grants: `core:tray:default`, `global-shortcut:default`, `autostart:default`.

### Testing (Sprint 0.4)

| Surface | Linux/Windows CI | macOS |
|---------|------------------|-------|
| Shortcut register/unregister | Rust `cargo test` + WebDriver | Rust `cargo test` only |
| `capture-triggered` UI | WebDriver + `e2e_emit_capture_triggered` | IPC hooks (manual / future plugin) |
| Window hide on close | WebDriver | Manual QA |
| Tray icon click / OS menu | Manual QA | Manual QA |

**macOS:** `tauri-driver` does not support WKWebView ([Tauri WebDriver docs](https://v2.tauri.app/develop/tests/webdriver/)). Native WebDriver e2e runs on Linux + Windows in CI; macOS uses Rust tests + manual tray checklist.

Global key injection in CI is unreliable — covered by IPC test hooks + Rust tests, not key simulation.

## Consequences

- Tray menu labels are English-only until i18n package (Phase 4).
- Shortcut conflicts return plugin errors — surfaced in Settings.
- New tray actions: extend `tray.rs` menu + emit typed events (avoid direct frontend imports from Rust).

## References

- [ADR-003](./003-desktop-ipc-and-events.md)
- [accessibility-audit.md](../accessibility-audit.md)
