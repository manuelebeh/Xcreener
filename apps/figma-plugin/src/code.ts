// Main thread: Figma document access only. Network calls live in the UI iframe,
// because this sandbox has no Blob, FormData, Headers or URLSearchParams.

const CONFIG_KEY = 'snapglow-config';

figma.showUI(__html__, { width: 360, height: 520, themeColors: true });

type UiMessage =
  | { type: 'load-config' }
  | { type: 'save-config'; payload: { apiKey: string; baseUrl: string } }
  | { type: 'export-selection' }
  | { type: 'place-image'; payload: { bytes: Uint8Array; width: number; height: number } };

figma.ui.onmessage = async (message: UiMessage) => {
  try {
    if (message.type === 'load-config') {
      const config = await figma.clientStorage.getAsync(CONFIG_KEY);
      figma.ui.postMessage({ type: 'config', config: config ?? null });
    }

    if (message.type === 'save-config') {
      await figma.clientStorage.setAsync(CONFIG_KEY, message.payload);
      figma.ui.postMessage({ type: 'config-saved' });
    }

    if (message.type === 'export-selection') {
      await exportSelection();
    }

    if (message.type === 'place-image') {
      placeImage(message.payload);
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

async function exportSelection() {
  const node = figma.currentPage.selection[0];
  if (!node) {
    figma.ui.postMessage({ type: 'error', message: 'Select a frame or node to import.' });
    return;
  }

  const exportSettings: ExportSettings = { format: 'PNG', constraint: { type: 'SCALE', value: 2 } };
  const bytes = await node.exportAsync(exportSettings);
  figma.ui.postMessage({ type: 'selection-bytes', bytes, name: node.name });
}

function placeImage(payload: { bytes: Uint8Array; width: number; height: number }) {
  const image = figma.createImage(payload.bytes);
  const node = figma.createRectangle();
  node.resize(payload.width, payload.height);
  node.fills = [{ type: 'IMAGE', scaleMode: 'FIT', imageHash: image.hash }];
  node.name = 'SnapGlow capture';
  figma.currentPage.appendChild(node);
  figma.viewport.scrollAndZoomIntoView([node]);
  figma.ui.postMessage({ type: 'image-placed' });
}
