import { buildCodeCaptureState } from '@snapglow/plugin-core';
import { SnapGlowClient } from '@snapglow/sdk';
import * as vscode from 'vscode';
import { getEditorLines, renderCodeToPng } from './codeRenderer';

const API_KEY_SECRET = 'snapglow.apiKey';

/** Electron clipboard buffer write is available at runtime but missing from @types/vscode. */
async function writeClipboardPng(png: Uint8Array): Promise<void> {
  const clipboard = vscode.env.clipboard as vscode.Clipboard & {
    writeBuffer(mime: string, value: Uint8Array): Thenable<void>;
  };
  await clipboard.writeBuffer('image/png', png);
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(API_KEY_SECRET);
}

export async function setApiKey(context: vscode.ExtensionContext): Promise<void> {
  const current = await context.secrets.get(API_KEY_SECRET);
  const value = await vscode.window.showInputBox({
    title: 'SnapGlow API Key',
    prompt: 'Enter your Team Pro workspace API key (sg_live_...)',
    password: true,
    value: current ?? '',
    ignoreFocusOut: true,
  });

  if (value === undefined) {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    await context.secrets.delete(API_KEY_SECRET);
    vscode.window.showInformationMessage('SnapGlow API key cleared.');
    return;
  }

  if (!trimmed.startsWith('sg_live_')) {
    vscode.window.showErrorMessage('Invalid API key format. Keys start with sg_live_.');
    return;
  }

  await context.secrets.store(API_KEY_SECRET, trimmed);
  vscode.window.showInformationMessage('SnapGlow API key saved.');
}

function getBaseUrl(): string {
  return (
    vscode.workspace.getConfiguration('snapglow').get<string>('baseUrl') ?? 'http://localhost:8787'
  );
}

async function createClient(context: vscode.ExtensionContext): Promise<SnapGlowClient | null> {
  const apiKey = await getApiKey(context);
  if (!apiKey) {
    const configure = 'Configure API Key';
    const choice = await vscode.window.showWarningMessage(
      'SnapGlow API key not configured.',
      configure
    );
    if (choice === configure) {
      await setApiKey(context);
    }
    return null;
  }

  return new SnapGlowClient({ apiKey, baseUrl: getBaseUrl() });
}

export async function captureEditor(): Promise<Buffer | null> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor to capture.');
    return null;
  }

  const document = editor.document;
  const selection = editor.selection;
  const fullText = document.getText();
  const startOffset = document.offsetAt(selection.start);
  const endOffset = document.offsetAt(selection.end);

  const lines = getEditorLines(
    fullText,
    selection.isEmpty ? 0 : startOffset,
    selection.isEmpty ? 0 : endOffset
  );

  const rendered = await renderCodeToPng({
    lines,
    language: document.languageId,
  });

  return rendered.png;
}

export async function captureAndBeautify(context: vscode.ExtensionContext): Promise<void> {
  const png = await captureEditor();
  if (!png) {
    return;
  }

  const client = await createClient(context);
  if (!client) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'SnapGlow: beautifying capture…',
      cancellable: false,
    },
    async () => {
      const editor = vscode.window.activeTextEditor;
      const fileName = editor?.document.fileName.split('/').pop() ?? 'capture';

      const blob = new Blob([new Uint8Array(png)], { type: 'image/png' });
      const uploaded = await client.captures.upload(blob, {
        title: fileName,
        tags: ['vscode'],
      });

      const state = buildCodeCaptureState(
        uploaded.documentState.screenshotWidth,
        uploaded.documentState.screenshotHeight
      );

      const beautified = await client.captures.beautify(uploaded.id, state, {
        title: fileName,
      });

      const exported = await client.captures.export(beautified.id, { format: 'png' });
      const imageResponse = await fetch(exported.exportUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      await writeClipboardPng(imageBuffer);

      vscode.window.showInformationMessage(
        `SnapGlow: beautified capture copied to clipboard (${exported.width}×${exported.height}).`
      );
    }
  );
}

export async function captureEditorToClipboard(): Promise<void> {
  const png = await captureEditor();
  if (!png) {
    return;
  }

  await writeClipboardPng(png);
  vscode.window.showInformationMessage('SnapGlow: editor capture copied to clipboard.');
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('snapglow.configureApiKey', () => setApiKey(context)),
    vscode.commands.registerCommand('snapglow.captureEditor', () => captureEditorToClipboard()),
    vscode.commands.registerCommand('snapglow.captureAndBeautify', () =>
      captureAndBeautify(context)
    )
  );
}

export function deactivate(): void {}
