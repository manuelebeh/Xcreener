# Tauri desktop

## App identity

- Identifier: `app.snapglow.desktop`
- Product: SnapGlow
- Crate: `snapglow-desktop` in `apps/desktop/src-tauri/`

## Window (Sprint 0.1 skeleton)

Menu-bar style: 480×640, native decorations on `main`, frameless `capture-overlay`, initially hidden (`visible: false`).

## Commands

Rust modules in `src-tauri/src/commands/`:

- `capture` - region/window/fullscreen, overlay, scroll/menu/delay live flows (Sprint 1.1 + 2b.3, ADR-007)
- `redaction` - `detect_sensitive_data` : OCR + regex detectors (Sprint 1.5)
- `classification` - `classify_content_command` : on-device screenshot content classifier (Sprint 2b.1)
- `ocr` - `recognize_text_command` : copy-text OCR, returns raw `TextLine[]` (Sprint 2b.2)
- `image_processing` - `detect_content_bounds_command`, `crop_image_command`, `compress_export_bytes_command` (Sprint 2b.2)
- `export` - `export_image` : compress + write to path (optional; primary export uses frontend canvas + `compress_export_bytes_command`)
- `storage` - settings IPC placeholders; frontend uses SQL plugin directly

Engines:

- **Capture** (`src-tauri/src/capture/`) : xcap preview/native grab, `scroll.rs` + `stitch.rs`, platform scroll (Home / Page Down)
- **OCR** (`src-tauri/src/ocr/`) : Vision macOS, Windows.Media.Ocr, Tesseract CLI fallback — shared by redaction and copy-text
- **Redaction** (`src-tauri/src/redaction/`) : regex detectors on OCR lines
- **Classification** (`src-tauri/src/classification/`) : TFLite when bundled, heuristic fallback
- **Image processing** (`src-tauri/src/image_processing/`) : trim margins, palette compression (imagequant), JPEG/WebP encode

Model artifacts: `src-tauri/resources/models/` (trained via `tools/style-classifier/`).

Register new commands in `lib.rs` and mirror types in `src/shared/types/ipc.ts` + `src/tauri/commands.ts`.

## Frontend modules (Sprint 2b+)

- `modules/style-suggestion/` - StyleSuggestionBar, auto scan
- `modules/text-extraction/` - TextExtractionBar, selection overlay, `writeText` clipboard
- `modules/auto-crop/` - AutoCropBar, undo via editor history

Shared packages: `@snapglow/style-suggestion-core`, `@snapglow/ocr-core`.

## SQLite

- Plugin: `tauri-plugin-sql`, preloaded DB `sqlite:snapglow.db`
- Migrations: `src/db/migrations/*.sql`, applied via `migrate.ts` (`ensureMigrationsApplied`)
- Capture history: `src/db/captures.ts` (retention 30, frontend-only)
- Settings keys (2b.2): `ocrEngine`, `ocrLanguages`, `smartCompression`
- Capability: `sql:default` + `sql:allow-execute` in `capabilities/default.json`

## Tauri features & security

- Cargo feature `image-png` on `tauri` - required for clipboard image copy (`Image.fromBytes`)
- Asset protocol enabled in `tauri.conf.json` - history thumbnails via `convertFileSrc`
- FS scope: `fs:scope-appdata-recursive` for `$APPDATA/**` (captures, thumbnails)
- Clipboard: `clipboard-manager:allow-write-image`, `clipboard-manager:allow-write-text`

CSP in `tauri.conf.json` - keep `'unsafe-inline'` for styles only as needed; no remote scripts.

## OCR dev notes (Tesseract fallback)

- macOS/Windows: native OCR used in `auto` mode without extra install
- Tesseract CLI fallback: `brew install tesseract` (+ language packs); optional `TESSDATA_PREFIX` or `SNAPGLOW_TESSDATA_DIR`
