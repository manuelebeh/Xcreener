/**
 * Validates Tauri global shortcut strings (subset used by SnapGlow).
 * Examples: CmdOrControl+Shift+KeyS, Alt+KeyA
 */
const SHORTCUT_PATTERN =
  /^(?:CmdOrControl|CommandOrControl|Ctrl|Control|Alt|Shift|Super|Meta)(?:\+(?:CmdOrControl|CommandOrControl|Ctrl|Control|Alt|Shift|Super|Meta|Key[A-Z]|Digit[0-9]|F[1-9]|F1[0-2]))+$/;

export function isValidCaptureShortcut(shortcut: string): boolean {
  const normalized = shortcut.trim();
  if (!normalized) {
    return false;
  }
  return SHORTCUT_PATTERN.test(normalized);
}

export function normalizeCaptureShortcut(shortcut: string): string {
  return shortcut.trim().replace(/CommandOrControl/g, 'CmdOrControl');
}
