# Technical Stack - Desktop (macOS & Windows)

> Architecture technique détaillée pour les applications desktop Xcreener
> **Version :** 1.0 | **Date :** Juin 2026 | **Statut :** Brouillon

← Cahier des Charges | → Sprints & Implementations

---

## 1. Vue d'ensemble de l'architecture

### 1.1 Principes directeurs

| Principe | Détail |
|---|---|
| **Privacy by design** | Tout traitement d'image se fait on-device. Aucune capture n'est envoyée au cloud sans consentement explicite de l'utilisateur. |
| **Performance first** | Capture → preview en < 200ms. Export en < 500ms. Rendu temps réel < 50ms. |
| **Offline-first** | Toutes les fonctionnalités core fonctionnent sans connexion internet. |
| **Modulaire** | Chaque feature est un module indépendant avec son propre cycle de vie. |
| **Cross-platform** | Un seul codebase frontend avec des bindings natifs par plateforme. |

### 1.2 Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Xcreener Desktop                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Frontend (WebView)                  │    │
│  │                                                       │    │
│  │   React + TypeScript + Tailwind CSS                   │    │
│  │   ┌──────────┐ ┌──────────┐ ┌───────────┐           │    │
│  │   │ Capture  │ │ Editor   │ │ Settings  │           │    │
│  │   │  Module  │ │  Module  │ │  Module   │           │    │
│  │   └────┬─────┘ └────┬─────┘ └─────┬─────┘           │    │
│  │        │             │              │                  │    │
│  │   ┌────┴─────────────┴──────────────┴─────┐          │    │
│  │   │          State Management              │          │    │
│  │   │          (Zustand / Jotai)             │          │    │
│  │   └───────────────┬───────────────────────┘          │    │
│  └───────────────────┼───────────────────────────────────┘    │
│                      │ Tauri IPC (invoke / events)            │
│  ┌───────────────────┼───────────────────────────────────┐    │
│  │              Backend (Rust Core)                       │    │
│  │                                                       │    │
│  │   ┌───────────┐ ┌───────────┐ ┌───────────┐         │    │
│  │   │  Screen   │ │  Image    │ │  Storage   │         │    │
│  │   │  Capture  │ │ Processing│ │  (SQLite)  │         │    │
│  │   │   API     │ │  Engine   │ │            │         │    │
│  │   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘         │    │
│  │         │              │              │               │    │
│  │   ┌─────┴──────────────┴──────────────┴─────┐        │    │
│  │   │          OS Native APIs                   │        │    │
│  │   │  macOS: ScreenCaptureKit, Vision, AppKit  │        │    │
│  │   │  Win: Graphics Capture API, Win32         │        │    │
│  │   └───────────────────────────────────────────┘        │    │
│  └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Framework Desktop : Tauri v2

### 2.1 Pourquoi Tauri plutôt qu'Electron

| Critère | Tauri v2 | Electron |
|---|---|---|
| **Taille du bundle** | ~5–15 MB | ~150–200 MB |
| **RAM au repos** | ~20–40 MB | ~100–300 MB |
| **Sécurité** | Sandboxed, permissions granulaires, IPC typé | Accès Node.js complet, surface d'attaque large |
| **Backend** | Rust (performances natives, memory safety) | Node.js (plus lent, GC pauses) |
| **WebView** | WebView natif de l'OS (WKWebView / WebView2) | Chromium embarqué (lourd) |
| **Mises à jour** | Updater intégré (delta updates) | electron-updater (lourd) |
| **Cross-platform** | macOS, Windows, Linux | macOS, Windows, Linux |
| **Licence** | MIT | MIT |

### 2.2 Configuration Tauri recommandée

```json
{
  "productName": "Xcreener",
  "version": "1.0.0",
  "identifier": "app.xcreener.desktop",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Xcreener",
        "width": 480,
        "height": 640,
        "resizable": true,
        "decorations": false,
        "transparent": true,
        "visible": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'"
    }
  },
  "plugins": {
    "shell": { "open": true },
    "updater": {
      "active": true,
      "endpoints": ["https://releases.snapglow.app/{{target}}/{{arch}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "..."
    },
    "global-shortcut": {},
    "clipboard-manager": {},
    "notification": {},
    "sql": { "preload": { "main": "sqlite:xcreener.db" } }
  }
}
```

### 2.3 Plugins Tauri utilisés

| Plugin | Usage |
|---|---|
| `@tauri-apps/plugin-global-shortcut` | Raccourcis clavier globaux (capture, copier, etc.) |
| `@tauri-apps/plugin-clipboard-manager` | Copier/coller vers le presse-papier système |
| `@tauri-apps/plugin-notification` | Notifications système (upload terminé, etc.) |
| `@tauri-apps/plugin-shell` | Ouvrir des URLs externes, glisser-déposer |
| `@tauri-apps/plugin-updater` | Mises à jour automatiques |
| `@tauri-apps/plugin-fs` | Accès au filesystem (export, import de fonds) |

La base SQLite locale n'est pas un plugin : Rust l'ouvre avec rusqlite (`src-tauri/src/db/`) et expose une commande typée par requête.
| `@tauri-apps/plugin-dialog` | Dialogues natifs (sauvegarder sous, ouvrir fichier) |
| `@tauri-apps/plugin-autostart` | Lancement au démarrage du système |
| `@tauri-apps/plugin-os` | Détection de l'OS, version, architecture |

---

## 3. Frontend : React + TypeScript

### 3.1 Stack frontend

| Technologie | Version | Rôle |
|---|---|---|
| **React** | 19.x | UI framework - composants déclaratifs |
| **TypeScript** | 5.x | Type safety, meilleure DX, refactoring sûr |
| **Tailwind CSS** | 4.x | Utility-first CSS, design system cohérent |
| **Zustand** | 5.x | State management léger (< 1KB), pas de boilerplate |
| **React Router** | 7.x | Navigation entre vues (éditeur, historique, settings) |
| **Radix UI** | Latest | Composants accessibles headless (dialog, dropdown, slider, tooltip) |
| **Vite** | 6.x | Build tool ultra-rapide (HMR < 50ms) |

### 3.2 Structure des modules frontend

```
src/
├── app/                    # Point d'entrée, routing, providers
│   ├── App.tsx
│   ├── routes.tsx
│   ├── components/         # AppTopNav (nav N1b - Sprint 1.6 polish)
│   └── providers/
├── modules/
│   ├── capture/            # Overlay capture (zone / fenêtre / écran / scroll / menu, Sprint 2b.3)
│   │   ├── components/     # CaptureOverlay, CaptureProgress (HUD), CaptureToolbar, …
│   │   ├── hooks/          # useCaptureSession, useGlobalShortcut
│   │   └── store.ts
│   ├── editor/             # Éditeur inline (beautification, annotations)
│   │   ├── annotations/    # Types, create, resize, utils (Sprint 1.4)
│   │   ├── components/
│   │   │   ├── Canvas.tsx
│   │   │   ├── EditorView.tsx         # Feature Stack (canvas + tools rail)
│   │   │   ├── EditorSection.tsx      # EditorToolsPanel + section labels (Sprint 1.6)
│   │   │   ├── StyleBar.tsx           # Sprint 1.3
│   │   │   ├── PresetBar.tsx          # Sprint 1.3
│   │   │   ├── PresetPicker.tsx       # Sprint 1.3
│   │   │   ├── PresetUndoToast.tsx    # Sprint 1.6
│   │   │   ├── AnnotationToolbar.tsx  # Sprint 1.4
│   │   │   └── TextEditorOverlay.tsx  # Sprint 1.4
│   │   ├── hooks/
│   │   │   ├── useBeautifyRender.ts         # Sprint 1.2
│   │   │   ├── useAnnotationInteraction.ts  # Sprint 1.4
│   │   │   ├── useEditorShortcuts.ts        # Sprint 1.4
│   │   │   └── useCanvasCoordinates.ts      # Sprint 1.4
│   │   ├── engine/         # renderFrame, draw*, hitTest, computeLayout
│   │   └── store.ts
│   ├── export/             # Export PNG/JPG/WebP, copier, drag & drop (Sprint 1.5)
│   │   ├── components/ExportBar.tsx
│   │   ├── hooks/useExportRender.ts
│   │   ├── utils/canvasExport.ts, smartCompression.ts, saveExport.ts, copyExport.ts, formats.ts
│   │   └── store.ts
│   ├── style-suggestion/   # Suggestion de style IA (Sprint 2b.1)
│   ├── text-extraction/    # OCR copy-text (Sprint 2b.2)
│   ├── auto-crop/          # Rogner marges vides (Sprint 2b.2)
│   ├── redaction/          # Détection et masquage de données sensibles (Sprint 1.5)
│   │   ├── components/RedactionBar.tsx, RedactionOverlay.tsx
│   │   ├── hooks/useRedactionScan.ts, useAutoRedaction.ts
│   │   ├── utils/mapToLayout.ts, screenshotToPngBytes.ts
│   │   └── store.ts
│   ├── history/            # Historique des captures (Sprint 1.6)
│   │   ├── components/     # HistoryGrid, HistoryCard, HistoryPreview, HistoryView
│   │   ├── hooks/          # useHistoryLoader, useOpenCapture, useLocalFileSrc
│   │   ├── utils/          # persistCapture, captureFiles, thumbnail, removeCapture
│   │   └── store.ts
│   └── settings/           # Préférences utilisateur
│       ├── components/
│       └── store.ts
├── shared/
│   ├── lib/                # tauri, shortcut helpers
│   ├── types/              # Types TypeScript partagés (ipc, settings)
│   └── utils/              # Utilitaires communs (image)
├── styles/                 # global.css - tokens import + design system stamp
└── tauri/
    ├── commands.ts         # Wrappers typés pour les commandes Tauri (invoke)
    └── events.ts           # Wrappers typés pour les événements Tauri (listen/emit)
```

### 3.3 State Management (Zustand)

Chaque module possède son propre store Zustand. Les stores communiquent via des subscriptions ciblées.

```typescript
// Exemple : store de l'éditeur (Sprint 1.4)
interface EditorState {
  screenshot: ImageBitmap | null
  background: BackgroundConfig
  padding: number
  borderRadius: number
  shadow: ShadowConfig
  transform: ScreenshotTransform
  selectedPresetId: string | null
  activeTool: EditorTool
  annotations: Annotation[]
  selectedAnnotationId: string | null
  toolDefaults: ToolDefaults
  history: { past: Annotation[][]; future: Annotation[][] }

  setScreenshot: (img: ImageBitmap | null) => void
  updateBackground: (bg: Partial<BackgroundConfig>) => void
  setActiveTool: (tool: EditorTool) => void
  addAnnotation: (annotation: Annotation) => void
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
}
```

---

## 4. Backend Rust (Tauri Core)

### 4.1 Responsabilités du backend Rust

Le backend Rust gère tout ce qui nécessite un accès natif à l'OS ou des performances critiques :

| Responsabilité | Détail |
|---|---|
| **Capture d'écran** | Appels aux APIs natives (ScreenCaptureKit, Graphics Capture API) |
| **Traitement image** | Opérations pixel-level (crop, resize, compression) via `image` crate |
| **Stockage local** | SQLite pour les métadonnées, fichiers pour les images |
| **Raccourcis globaux** | Interception des hotkeys système |
| **Menu bar / System tray** | Icône et menu contextuel persistant |
| **Auto-start** | Enregistrement au démarrage de l'OS |
| **Mise à jour** | Vérification et application des updates |

### 4.2 Crates Rust principales

| Crate | Version | Usage |
|---|---|---|
| `tauri` | 2.x | Framework principal |
| `image` | 0.25.x | Manipulation d'images (crop, resize, encode/decode) |
| `screenshots` | 0.8.x | Capture d'écran cross-platform (wrapper) |
| **xcap** | En usage (Sprint 1.1) | Capture preview, moniteurs, fenêtres (`src-tauri/src/capture/`) |
| `rusqlite` | 0.31.x | SQLite natif (si besoin de bypasser le plugin) |
| `serde` / `serde_json` | 1.x | Sérialisation/désérialisation des données IPC |
| `tokio` | 1.x | Runtime async (pour les opérations I/O non-bloquantes) |
| `anyhow` / `thiserror` | Latest | Gestion d'erreurs ergonomique |
| `tracing` | 0.1.x | Logging structuré |
| `imagequant` | 4.x | Compression PNG palette (pngquant-style, Sprint 2b.2) |
| `webp` | 0.3.x | Encodage WebP export (Sprint 2b.2) |
| `png` | 0.17.x | Encodage PNG indexé post-quantization (Sprint 2b.2) |
| `tempfile` | 3.x | Fichiers temporaires (Tesseract CLI Sprint 2b.2 ; frames RGBA enregistrement Sprint 2b.4) |
| `screencapturekit` | 8.x | Streaming capture région macOS (`platform/macos_record.rs`, Sprint 2b.4) |
| `gif` | 0.13.x | Encodage GIF animé (`capture/record/encode_gif.rs`, Sprint 2b.4) |
| `openh264` | 0.6.x | Encodeur H.264 software (`capture/record/encode_mp4.rs`, Sprint 2b.4) |
| `mp4` | 0.14.x | Mux MP4 / avc1 (`capture/record/encode_mp4.rs`, Sprint 2b.4) |
| `bytes` | 1.x | Payload samples MP4 (Sprint 2b.4) |

### 4.3 Commandes Tauri (IPC)

> **État Sprint 2b.4 (QA 2026-06-21) :** en plus du livrable 2b.3 — enregistrement zone GIF ≤ 8 s / MP4 ≤ 30 s (`capture/record/`), SCK macOS + polling Windows, encodage GIF (grille 20 fps, imagequant, qualité low/medium/high) + MP4 H.264 CFR (openh264), overlay Photo/Video + HUD pause/stop, post-capture sauvegarde + historique + `open_path_command`. Détail : [ADR-008](./adr/008-screen-recording.md).

> **État Sprint 2b.3 :** en plus du livrable 2b.2 — capture live **Scroll** (`capture_scrolling_window_command`, `capture/scroll.rs`, `capture/stitch.rs`, `resolve_window`), **Menu** + **Delay** (`capture_native_command`), HUD overlay scroll, `stop_scrolling_capture_command`. Détail : [ADR-007](./adr/007-live-capture-flows.md).

> **État Sprint 2b.2 :** capture native (Sprint 1.1), redaction + OCR copy-text (`detect_sensitive_data`, `recognize_text_command`), auto-crop (`detect_content_bounds_command`, `crop_image_command`), compression export (`compress_export_bytes_command`), classification (`classify_content_command`), export fichier côté frontend (offscreen canvas + compression Rust optionnelle + dialog/fs/clipboard), historique captures côté frontend (`db/captures.ts` + fs). Détail : [ADR-006](./adr/006-native-capture-overlay.md), [ADR-003](./adr/003-desktop-ipc-and-events.md).

```rust
// Capture - commandes Rust (xcap) ; l'overlay confirme via découpe preview côté React
#[tauri::command]
async fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<Vec<u8>, String> { ... }

#[tauri::command]
async fn show_capture_overlay(app: AppHandle) -> Result<CaptureOverlayBounds, String> { ... }

// Redaction - Sprint 1.5 : OCR + regex on-device (src-tauri/src/redaction/)
#[tauri::command]
async fn detect_sensitive_data(image_data: Vec<u8>) -> Result<Vec<SensitiveRegion>, String> {
    // src-tauri/src/ocr/ → détecteurs email, phone, card, api_key, url, password
}

// OCR copy-text - Sprint 2b.2 (src-tauri/src/ocr/, moteur partagé avec redaction)
#[tauri::command]
async fn recognize_text_command(
    image_data: Vec<u8>,
    options: RecognizeTextOptions,  // engine: auto|native|tesseract, languages
) -> Result<Vec<TextLine>, String> { ... }

// Auto-crop + compression - Sprint 2b.2 (src-tauri/src/image_processing/)
#[tauri::command]
async fn detect_content_bounds_command(image_data: Vec<u8>) -> Result<ContentBounds, String> { ... }

#[tauri::command]
async fn compress_export_bytes_command(
    image_data: Vec<u8>,
    format: String,
    quality: u8,
) -> Result<Vec<u8>, String> { ... }

// Classification - Sprint 2b.1
#[tauri::command]
async fn classify_content_command(image_data: Vec<u8>) -> Result<ClassificationResult, String> { ... }

// Live capture - Sprint 2b.3 (src-tauri/src/capture/, ADR-007)
#[tauri::command]
async fn capture_native_command(app: AppHandle, request: CaptureNativeRequest) -> Result<Vec<u8>, String> { ... }

#[tauri::command]
async fn capture_scrolling_window_command(app: AppHandle, window: WindowInfo) -> Result<Vec<u8>, String> { ... }

#[tauri::command]
async fn stop_scrolling_capture_command() -> Result<(), String> { ... }

// Screen recording - Sprint 2b.4 (capture/record/, ADR-008)
#[tauri::command]
async fn start_region_recording_command(app: AppHandle, request: CaptureRecordStartRequest) -> Result<(), String> { ... }

#[tauri::command]
async fn pause_region_recording_command() -> Result<(), String> { ... }

#[tauri::command]
async fn resume_region_recording_command() -> Result<(), String> { ... }

#[tauri::command]
async fn stop_region_recording_command(app: AppHandle) -> Result<CaptureRecordingCompletePayload, String> { ... }

#[tauri::command]
async fn cancel_region_recording_command() -> Result<(), String> { ... }

#[tauri::command]
async fn open_path_command(path: String) -> Result<(), String> { ... }

// Historique - Sprint 1.6 : frontend-only (db/captures.ts + fs plugin, pas de commande Rust)
```

### 4.4 APIs natives par plateforme

#### macOS

| API | Usage | Disponibilité |
|---|---|---|
| **ScreenCaptureKit** | Capture de zone, fenêtre, écran, recording | macOS 12.3+ |
| **CGWindowListCreateImage** | Capture de fenêtre (fallback) | macOS 10.5+ |
| **Vision Framework** | OCR natif, détection de texte | macOS 11+ |
| **AppKit (NSStatusBar)** | Menu bar item | Toutes versions |
| **CoreGraphics** | Manipulation d'images bas-niveau | Toutes versions |
| **CoreML** | Modèle IA on-device pour suggestion de style | macOS 11+ |

#### Windows

| API | Usage | Disponibilité |
|---|---|---|
| **Windows.Graphics.Capture** | Capture de zone, fenêtre, écran | Windows 10 (1903+) |
| **BitBlt / PrintWindow** | Capture de fenêtre (fallback) | Toutes versions |
| **Windows.Media.Ocr** | OCR natif | Windows 10+ |
| **Shell_NotifyIcon** | System tray icon | Toutes versions |
| **Direct2D** | Manipulation d'images bas-niveau | Windows 7+ |
| **WinML** | Modèle IA on-device | Windows 10 (1903+) |

---

## 5. Moteur de Rendu (Canvas)

> **État Sprint 2b.2 :** moteur `renderFrame` dans `modules/editor/engine/` - layers 1–5 (fond, ombre, capture, flou manuel/auto, annotations). Rendu via `useBeautifyRender` (rAF, gated on `canvasMounted`). Interactions annotations via `useAnnotationInteraction` (idem - le canvas est monté conditionnellement après `displaySize`). **Shell UI** : `AppTopNav` (N1b) + routes ; **éditeur** Feature Stack (`EditorView` - canvas sticky + `EditorToolsPanel` scrollable, ordre Format → Auto-crop → Style suggestion → Style → Annotations → Text extraction → Sensitive data → Export). **Design system** : `design.md` (verrouillé) + `@xcreener/design-tokens` + `@xcreener/ui`. Undo/redo (20 niveaux). Export WYSIWYG via `renderToExportCanvas` (offscreen, `selectedAnnotationId: null`, `pixelRatio: 1`) + compression Rust optionnelle (`smartCompression` setting). Clipboard image : `Image.fromBytes` ; clipboard texte OCR : `writeText`.

### 5.1 Architecture du moteur

Le moteur de rendu utilise le **Canvas 2D API** du WebView pour composer le résultat final en temps réel.

```
Layers (bas → haut) :
┌──────────────────────────────────┐
│  Layer 5 : Annotations           │  Texte, formes, flèches, highlight
│  Layer 4 : Blur                    │  Flou manuel + masques redaction auto (`BlurAnnotation`)
│  Layer 3 : Screenshot            │  L'image capturée (avec border-radius)
│  Layer 2 : Shadow                │  Ombre portée sous le screenshot
│  Layer 1 : Background            │  Dégradé, couleur unie, ou image
└──────────────────────────────────┘
```

> **Redaction (Sprint 1.5) :** le scan OCR crée des `BlurAnnotation` sur la layer 4 - pas de couche de rendu séparée. L’overlay `RedactionOverlay` sert uniquement à la prévisualisation avant masquage.

### 5.2 Pipeline de rendu

```
Capture (pixels bruts)
  │
  ▼
Crop & Resize (si nécessaire)
  │
  ▼
Auto-balance (centrage, padding)
  │
  ▼
Composition Canvas :
  1. Dessiner le fond (gradient/color/image)
  2. Appliquer l'ombre portée (shadow)
  3. Dessiner le screenshot (avec border-radius via clip)
  4. Appliquer les masques de flou (gaussian / pixelate) - `drawBlurMasks` (manuel + redaction)
  5. Dessiner les annotations (texte, formes, highlight) - `drawAnnotations`
  │
  ▼
Preview temps réel (< 50ms par frame)
  │
  ▼
Export WYSIWYG (`renderToExportCanvas` → `canvasToBlob` → PNG/JPG/WebP ; clipboard via `Image.fromBytes` ; drag-out)
```

### 5.3 Optimisation du rendu

| Technique | Détail |
|---|---|
| **OffscreenCanvas** | Rendu dans un Web Worker pour ne pas bloquer le thread principal |
| **Layer caching** | Chaque layer est cachée en bitmap ; seule la layer modifiée est re-rendue |
| **RequestAnimationFrame** | Synchronisation avec le taux de rafraîchissement de l'écran |
| **Canvas pooling** | Réutilisation des objets Canvas pour éviter les allocations |
| **Debounce des inputs** | Les sliders (padding, radius) sont debounced à 16ms (~60fps) |

---

## 6. Stockage Local

### 6.1 SQLite (via Tauri SQL plugin)

Base de données locale pour les métadonnées des captures et les préférences.

```sql
-- Table des captures
CREATE TABLE captures (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT NOT NULL,
    filepath    TEXT NOT NULL,
    thumbnail   TEXT,                -- chemin vers la miniature
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    format      TEXT NOT NULL,       -- 'png' | 'jpg' | 'webp'
    file_size   INTEGER NOT NULL,    -- en bytes
    preset_used TEXT,                -- preset utilisé (nullable)
    tags        TEXT,                -- JSON array de tags
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table des presets personnalisés
CREATE TABLE custom_presets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    aspect_ratio    TEXT,             -- '16:9', '4:3', '1:1', 'free'
    background      TEXT NOT NULL,    -- JSON config du fond
    padding         INTEGER NOT NULL DEFAULT 40,
    border_radius   INTEGER NOT NULL DEFAULT 12,
    shadow          TEXT NOT NULL,    -- JSON config de l'ombre
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table des settings
CREATE TABLE settings (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL
);

-- Index pour la recherche rapide
CREATE INDEX idx_captures_created_at ON captures(created_at DESC);
CREATE INDEX idx_captures_tags ON captures(tags);
```

### 6.2 Filesystem

> **Historique (Sprint 1.6) :** persistance via `@tauri-apps/plugin-fs` (`fs:scope-appdata-recursive`). Miniatures servies via asset protocol (`convertFileSrc`).

```
~/Library/Application Support/Xcreener/    (macOS)
%APPDATA%/Xcreener/                        (Windows)
├── captures/                               # Images capturées (originaux)
│   ├── 2026-06/
│   │   ├── capture_20260615_143022.png
│   │   └── ...
├── thumbnails/                             # Miniatures pour l'historique
│   ├── thumb_20260615_143022.webp
│   └── ...
├── presets/                                # Fonds personnalisés (images)
├── xcreener.db                            # Base SQLite
└── config.json                            # Config rapide (raccourcis, thème)
```

---

## 7. Détection de données sensibles (On-device)

> **Livré Sprint 1.5** - module Rust `src-tauri/src/redaction/` + UI `modules/redaction/`.

### 7.1 Architecture du moteur de redaction

```
Image capturée (PNG bytes bruts, pas le canvas beautifié)
  │
  ▼
OCR (extraction du texte + positions) — moteur partagé `src-tauri/src/ocr/`
  ├── macOS : Apple Vision Framework (objc2-vision)
  ├── Windows : Windows.Media.Ocr
  └── Fallback : Tesseract CLI (TSV) — langues EN/FR/DE/JP via settings
  │
  ▼
Pattern matching (regex sur le texte extrait)
  ├── Emails       : /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  ├── Téléphones   : /(\+?[0-9]{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}/
  ├── Cartes       : /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/ (+ validation Luhn)
  ├── Clés API     : /(?:sk|pk|api|key|token|secret|password)[-_]?[a-zA-Z0-9]{16,}/i
  ├── URLs sens.   : /https?:\/\/[^\s]*(?:token|key|secret|password|auth)[^\s]*/i
  └── Mots de passe: détection contextuelle (champs "password", "secret", etc.)
  │
  ▼
Bounding boxes des régions sensibles → `SensitiveRegion[]` (IPC)
  │
  ▼
UI : highlight (`RedactionOverlay`) puis masquage → `BlurAnnotation` (layer 4, blur gaussien)
```

### 7.2 Garantie de confidentialité

- Le traitement OCR est 100% on-device (aucun appel réseau)
- Les patterns regex s'exécutent localement sur le texte extrait
- Les données sensibles détectées ne sont jamais persistées - seules les positions des masques sont sauvegardées
- Aucune télémétrie ne contient de données sensibles

---

## 8. IA On-device (Phase 2)

> **Statut implémentation (2026-06-20)** : pipeline desktop livré (Sprint 2b.1). Mapping style dans `@xcreener/style-suggestion-core`, UI `StyleSuggestionBar`, commande Tauri `classify_content_command`. **Modèle MobileNetV3 non entraîné** — pas de dataset ; fallback heuristique on-device en attendant `tools/style-classifier/` + export vers `src-tauri/resources/models/`.

### 8.1 Modèle de suggestion de style

| Aspect | Détail |
|---|---|
| **Type** | Classification d'image (code, UI web, terminal, photo, diagramme, texte) |
| **Framework** | TensorFlow Lite (cross-platform, `tract-tflite`) + Core ML (macOS natif, export prévu) |
| **Runtime actuel** | Heuristique couleur/luminosité/contours si `.tflite` absent ; TFLite si modèle bundlé |
| **Taille du modèle** | < 5 MB (MobileNet V3 fine-tuné) |
| **Latence** | < 500 ms (critère sprint) ; cible doc < 100 ms CPU avec modèle entraîné |
| **Entraînement** | Dataset custom ~500–2000 captures/classe ; tooling `tools/style-classifier/` |
| **Gate qualité** | ≥ 80 % accuracy sur split `test/` (`scripts/evaluate.py`) avant export prod |

**Fichiers clés**

| Zone | Chemin |
|---|---|
| Mapping style | `packages/style-suggestion-core/` |
| UI desktop | `apps/desktop/src/modules/style-suggestion/` |
| Inférence Rust | `apps/desktop/src-tauri/src/classification/` |
| Training offline | `tools/style-classifier/` |
| Modèles bundlés | `apps/desktop/src-tauri/resources/models/` |

### 8.2 Mapping classification → style

| Type de contenu | Fond suggéré | Ombre | Padding | Border radius |
|---|---|---|---|---|
| Code source | Fond sombre (gradient bleu-violet) | Forte | Large (60px) | 12px |
| UI web | Fond clair (gradient gris-blanc) | Légère | Moyen (40px) | 16px |
| Terminal | Fond noir uni | Moyenne | Large (60px) | 8px |
| Photo | Fond flou extrait de l'image | Aucune | Petit (20px) | 0px |
| Diagramme | Fond blanc uni | Légère | Moyen (40px) | 0px |
| Texte / document | Fond crème | Légère | Moyen (40px) | 4px |

### 8.3 OCR copy-text, auto-crop, compression export (Sprint 2b.2)

> **Statut implémentation (2026-06-20)** : desktop livré. Package `@xcreener/ocr-core`, UI `TextExtractionBar` + overlay sélection, `AutoCropBar`, setting **Smart export compression**.

| Feature | Backend | Frontend | IPC |
|---|---|---|---|
| Copy-text OCR | `src-tauri/src/ocr/` | `modules/text-extraction/` | `recognize_text_command` |
| Auto-crop marges | `src-tauri/src/image_processing/trim.rs` | `modules/auto-crop/` | `detect_content_bounds_command`, `crop_image_command` |
| Compression export | `src-tauri/src/image_processing/compress.rs` (imagequant PNG, JPEG/WebP) | `modules/export/utils/smartCompression.ts` | `compress_export_bytes_command` |

**Notes**

- OCR copy-text réutilise le même moteur que la redaction ; `detect_sensitive_data` applique les regex PII, `recognize_text_command` retourne les lignes brutes.
- Tesseract : CLI système (`tesseract … tsv`), pas `tesseract.js` WASM — voir settings `ocrEngine` / `ocrLanguages`.
- Auto-crop : refuse si gain < 5 % de surface ; undo via historique éditeur (`pushHistory` + `cropScreenshot`).
- Compression : activée par défaut ; cible ≥ 30 % sur PNG UI typiques (test Rust `png_compression_reduces_size`).

---

## 9. Build & Distribution

### 9.1 CI/CD Pipeline (GitHub Actions)

```yaml
# Workflow simplifié
name: Build & Release

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: aarch64-apple-darwin    # Apple Silicon
          - os: macos-latest
            target: x86_64-apple-darwin     # Intel Mac
          - os: windows-latest
            target: x86_64-pc-windows-msvc

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: pnpm install
      - run: pnpm tauri build --target ${{ matrix.target }}
      - uses: tauri-apps/tauri-action@v0
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
```

### 9.2 Formats de distribution

| Plateforme | Format | Signature | Distribution |
|---|---|---|---|
| macOS (Apple Silicon) | `.dmg` (universal) | Developer ID + Notarization | Site direct + Setapp |
| macOS (Intel) | `.dmg` | Developer ID + Notarization | Site direct + Setapp |
| macOS (App Store) | `.pkg` | App Store Connect | Mac App Store |
| Windows | `.msi` + `.exe` (NSIS) | Code signing certificate | Site direct |
| Windows (Store) | `.msix` | Microsoft Partner Center | Microsoft Store |

### 9.3 Taille des builds cibles

| Plateforme | Cible |
|---|---|
| macOS (.dmg) | < 25 MB |
| Windows (.msi) | < 20 MB |
| RAM au repos (menu bar) | < 30 MB |
| RAM éditeur ouvert | < 100 MB |

---

## 10. Tests

### 10.1 Stratégie de tests

| Type | Outil | Couverture cible |
|---|---|---|
| **Tests unitaires** (frontend) | Vitest | ≥ 80% des fonctions utilitaires et hooks |
| **Tests unitaires** (Rust) | `cargo test` | ≥ 80% des commandes Tauri |
| **Tests de composants** | React Testing Library | Composants critiques (Editor, StyleBar) |
| **Tests d'intégration** | Playwright + Tauri Driver | Flux complets (capture → export) ; spec `capture-beautify-export.spec.ts` (inject → beautify → export) |
| **Tests visuels** | Storybook + Chromatic | Régression visuelle des composants |
| **Tests de performance** | Lighthouse CI + custom benchmarks | Temps de rendu < 50ms, export < 500ms |

### 10.2 Matrice de compatibilité

| OS | Versions testées |
|---|---|
| macOS | 12 (Monterey), 13 (Ventura), 14 (Sonoma), 15 (Sequoia) |
| Windows | 10 (21H2+), 11 (22H2+) |
| Résolutions | 1080p, 1440p, 4K, écrans Retina, multi-écran |
| DPI scaling | 100%, 125%, 150%, 200% |

---

## 11. Monitoring & Observabilité

| Outil | Usage |
|---|---|
| **PostHog** | Product analytics - événements clés (capture, export, preset utilisé) |
| **Sentry** | Crash reporting + error tracking (frontend + Rust panics) |
| **Tauri Updater** | Monitoring des mises à jour (adoption, erreurs) |
| **Custom metrics** | Temps de capture, temps de rendu, taille des exports (anonymisé) |

### Événements PostHog clés

| Événement | Propriétés |
|---|---|
| `capture_taken` | `type` (zone/window/fullscreen), `os`, `display_count` |
| `beautification_applied` | `background_type`, `preset`, `border_radius`, `shadow` |
| `annotation_added` | `type` (text/shape/blur/highlight) |
| `export_completed` | `format`, `file_size`, `duration_ms` |
| `redaction_triggered` | `auto_or_manual`, `types_detected`, `count` |
| `preset_selected` | `preset_name`, `is_custom` |

---

## 12. Sécurité

### 12.1 Modèle de menaces

| Menace | Mitigation |
|---|---|
| Injection via IPC | Validation stricte des arguments côté Rust. CSP restrictive. |
| Exfiltration de captures | Aucun upload sans consentement. Pas de dépendance réseau dans le core. |
| Tampering des mises à jour | Signature Ed25519 via Tauri Updater. Vérification côté client. |
| Accès non autorisé au stockage | Permissions filesystem restrictives. Chiffrement optionnel (Phase 2). |

### 12.2 Permissions Tauri (allowlist)

```json
{
  "permissions": [
    "core:default",
    "global-shortcut:default",
    "clipboard-manager:default",
    "clipboard-manager:allow-write-image",
    "fs:default",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-exists",
    "fs:scope-appdata-recursive",
    "dialog:default",
    "autostart:default",
    "updater:default",
    "process:default"
  ]
}
```

> Voir `apps/desktop/src-tauri/capabilities/default.json` pour la liste exacte. Cargo feature `image-png` requise pour le clipboard image (`Image.fromBytes`).

---

## 13. Dépendances NPM principales

| Package | Usage |
|---|---|
| `react` + `react-dom` | UI framework |
| `typescript` | Type safety |
| `tailwindcss` | Styling utility-first |
| `zustand` | State management |
| `@radix-ui/*` | Composants accessibles (slider, dialog, dropdown, tooltip) |
| `framer-motion` | Animations fluides |
| `@tauri-apps/api` | API Tauri côté frontend |
| `@tauri-apps/plugin-*` | Plugins Tauri (voir section 2.3) |
| `@phosphor-icons/react` | Icônes cohérentes |
| `@xcreener/style-suggestion-core` | Mapping classification → style (desktop, Sprint 2b.1) |
| `@xcreener/ocr-core` | Types OCR + helpers copy-text (desktop, Sprint 2b.2) |
| `@xcreener/redaction-core` | Détecteurs regex + mapRegionToLayout (desktop + mobile) |
| `date-fns` | Manipulation de dates (historique) |
| `zod` | Validation de schémas (settings, presets) |

---

## Documents liés

- Cahier des Charges - Point d'entrée documentation
- Product Requirements (private, `docs/internal/`)
- Sprints & Implementations (private, `docs/internal/`) - Planning de développement
- Cahier des Charges - Spécifications originales
- Competitive Analysis - Benchmarking concurrents

---

*v1.0 - Juin 2026 - Usage confidentiel*
