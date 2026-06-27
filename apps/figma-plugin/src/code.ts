import { buildDesignCaptureState } from '@snapglow/plugin-core';
import { SnapGlowClient } from '@snapglow/sdk';

import uiHtml from '../ui.html';

figma.showUI(uiHtml, { width: 360, height: 520, themeColors: true });

figma.ui.onmessage = async (message: { type: string; payload?: unknown }) => {
  if (message.type === 'import-selection') {
    await importSelection(message.payload as { apiKey: string; baseUrl: string });
  }

  if (message.type === 'export-to-canvas') {
    await exportToCanvas(message.payload as { apiKey: string; baseUrl: string; captureId: string });
  }

  if (message.type === 'list-captures') {
    await listCaptures(message.payload as { apiKey: string; baseUrl: string });
  }
};

async function importSelection(config: { apiKey: string; baseUrl: string }) {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'error', message: 'Select a frame or node to import.' });
    return;
  }

  const node = selection[0];
  if (!node) {
    return;
  }

  const exportSettings: ExportSettings = { format: 'PNG', constraint: { type: 'SCALE', value: 2 } };
  const bytes = await node.exportAsync(exportSettings);
  const client = new SnapGlowClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });

  const blob = new Blob([bytes], { type: 'image/png' });
  const uploaded = await client.captures.upload(blob, {
    title: node.name,
    tags: ['figma'],
  });

  const state = buildDesignCaptureState(
    uploaded.documentState.screenshotWidth,
    uploaded.documentState.screenshotHeight
  );

  await client.captures.beautify(uploaded.id, state, { title: node.name });
  const exported = await client.captures.export(uploaded.id, { format: 'png' });

  figma.ui.postMessage({
    type: 'import-complete',
    previewUrl: exported.exportUrl,
    captureId: uploaded.id,
  });
}

async function exportToCanvas(config: { apiKey: string; baseUrl: string; captureId: string }) {
  const client = new SnapGlowClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
  const exported = await client.captures.export(config.captureId, { format: 'png' });
  const response = await fetch(exported.exportUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const image = figma.createImage(bytes);
  const node = figma.createRectangle();
  node.resize(exported.width, exported.height);
  node.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: image.hash }];
  node.name = 'SnapGlow capture';
  figma.currentPage.appendChild(node);
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.ui.postMessage({ type: 'export-complete' });
}

async function listCaptures(config: { apiKey: string; baseUrl: string }) {
  const client = new SnapGlowClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });
  const list = await client.captures.list({ limit: 20 });
  figma.ui.postMessage({
    type: 'captures-list',
    items: list.items.map((item) => ({
      id: item.id,
      title: item.title ?? 'Untitled',
      createdAt: item.createdAt,
    })),
  });
}
