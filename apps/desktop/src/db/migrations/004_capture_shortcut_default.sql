-- 2026-10-25: the default capture shortcut moved from Cmd/Ctrl+Shift+S, which took "Save As"
-- from every other app, to Cmd/Ctrl+Shift+2. Installs still on the old default follow it;
-- a shortcut the user picked stays.

UPDATE settings SET value = 'CmdOrControl+Shift+Digit2'
WHERE key = 'captureShortcut' AND value = 'CmdOrControl+Shift+KeyS';
