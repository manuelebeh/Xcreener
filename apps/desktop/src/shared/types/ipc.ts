export type CaptureMediaKind = 'photo' | 'video';

export type CaptureTargetMode = 'region' | 'window' | 'fullscreen' | 'scroll' | 'menu';

export type CaptureType = CaptureTargetMode | 'record';

export type CaptureRecordOutputFormat = 'gif' | 'mp4';

export type CaptureGifQuality = 'low' | 'medium' | 'high';

export type CaptureMode = CaptureTargetMode | 'idle';

export type CaptureDelaySecs = 0 | 3 | 5 | 10;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MonitorInfo {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}

export interface WindowInfo {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureOverlayInitPayload {
  bounds: CaptureOverlayBounds;
  monitors: MonitorInfo[];
  /** Bytes wait in Rust: read them with takeOverlayPreview. */
  hasPreview?: boolean;
  liveOverlay?: boolean;
  webviewLayout?: OverlayWebviewLayout;
}

export interface CaptureNativeRequest {
  kind: CaptureType;
  rect?: Rect;
  windowId?: number;
  monitorId?: number;
  delaySecs: CaptureDelaySecs;
}

export interface CaptureProgressPayload {
  phase: 'countdown' | 'scroll' | 'recording';
  remainingSecs?: number;
  current?: number;
  total?: number;
  elapsedSecs?: number;
  paused?: boolean;
  frameCount?: number;
  maxDurationSecs?: number;
}

export interface CaptureRecordStartRequest {
  rect: Rect;
  outputFormat?: CaptureRecordOutputFormat;
  maxDurationSecs?: number;
  /** GIF quality preset; ignored for MP4. */
  gifQuality?: CaptureGifQuality;
}

export interface CaptureRecordingCompletePayload {
  filePath: string;
  format: CaptureRecordOutputFormat;
  width: number;
  height: number;
  durationMs: number;
  fileSize: number;
  /** Bytes wait in Rust: read them with takeRecordingThumbnail. */
  hasThumbnail?: boolean;
}

export interface OverlayWebviewLayout {
  scaleFactor: number;
  innerWidth: number;
  innerHeight: number;
}

export interface SensitiveRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: string;
}

export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type OcrEngineMode = 'auto' | 'native' | 'tesseract';

export interface RecognizeTextOptions {
  engine: OcrEngineMode;
  languages: string[];
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContentAnalysis {
  /** Tight box around everything that differs from the background. */
  bounds: ContentBounds;
  /** RGBA background color sampled from the four corners. */
  background: [number, number, number, number];
}

export type ContentClass = 'code' | 'ui' | 'terminal' | 'photo' | 'diagram' | 'text';

export interface ClassificationResult {
  class: ContentClass;
  confidence: number;
  latencyMs: number;
}

export interface CaptureMetadata {
  filename: string;
  filepath: string;
  width: number;
  height: number;
  format: 'png' | 'jpg' | 'webp';
  fileSize: number;
}

export interface CaptureImagePayload {
  width: number;
  height: number;
}

export interface CaptureErrorPayload {
  message: string;
}

/** Plan from a signature-checked API token (`verify_entitlement`). */
export interface Entitlement {
  plan: 'free' | 'team_starter' | 'team_pro';
  /** Unix seconds. */
  expiresAt: number;
}

/** Rows returned by the `src-tauri/src/db` commands (column names as in SQLite). */
export interface DbCaptureRow {
  id: number;
  filename: string;
  filepath: string;
  thumbnail: string | null;
  width: number;
  height: number;
  format: string;
  file_size: number;
  preset_used: string | null;
  tags: string | null;
  ocr_text: string | null;
  created_at: string;
  /** Only set by `captures_search` on a full-text match. */
  snippet?: string | null;
}

export interface DbInsertCaptureInput {
  filename: string;
  filepath: string;
  thumbnail: string | null;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  /** JSON array of tag strings. */
  tags: string;
  uid: string;
}

export interface DbCollectionRow {
  id: number;
  name: string;
  created_at: string;
}

export interface DbCustomPresetRow {
  id: number;
  name: string;
  width: number | null;
  height: number | null;
  aspect_ratio: string | null;
  background: string;
  padding: number;
  border_radius: number;
  shadow: string;
}

export interface DbCreatePresetInput {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  /** JSON. */
  background: string;
  padding: number;
  borderRadius: number;
  /** JSON. */
  shadow: string;
}
