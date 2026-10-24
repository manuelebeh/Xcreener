import { buildDesignCaptureState } from '@snapglow/plugin-core';
import { SnapGlowClient } from '@snapglow/sdk';

const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
const saveConfigButton = document.getElementById('saveConfig') as HTMLButtonElement;
const importButton = document.getElementById('importSelection') as HTMLButtonElement;
const refreshButton = document.getElementById('refreshCaptures') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;
const capturesEl = document.getElementById('captures') as HTMLDivElement;
const previewEl = document.getElementById('preview') as HTMLImageElement;

interface StoredConfig {
  apiKey: string;
  baseUrl: string;
}

type PluginMessage =
  | { type: 'config'; config: StoredConfig | null }
  | { type: 'config-saved' }
  | { type: 'selection-bytes'; bytes: Uint8Array; name: string }
  | { type: 'image-placed' }
  | { type: 'error'; message: string };

function getConfig(): StoredConfig {
  return {
    apiKey: apiKeyInput.value.trim(),
    baseUrl: baseUrlInput.value.trim() || 'http://localhost:8787',
  };
}

function createClient(): SnapGlowClient | null {
  const config = getConfig();
  if (!config.apiKey) {
    setStatus('Enter your SnapGlow API key first.');
    return null;
  }
  return new SnapGlowClient(config);
}

function postToPlugin(message: unknown) {
  parent.postMessage({ pluginMessage: message }, '*');
}

function setStatus(text: string) {
  statusEl.textContent = text;
}

async function run(label: string, task: () => Promise<void>) {
  setStatus(label);
  try {
    await task();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
  }
}

async function refreshCaptures() {
  const client = createClient();
  if (!client) {
    return;
  }

  await run('Loading captures…', async () => {
    const list = await client.captures.list({ limit: 20 });
    capturesEl.innerHTML = '';
    for (const item of list.items) {
      const div = document.createElement('div');
      div.className = 'capture-item';
      div.textContent = `${item.title ?? 'Untitled'} · ${new Date(item.createdAt).toLocaleDateString()}`;
      div.onclick = () => placeCapture(item.id);
      capturesEl.appendChild(div);
    }
    setStatus(list.items.length === 0 ? 'No captures yet.' : '');
  });
}

async function placeCapture(captureId: string) {
  const client = createClient();
  if (!client) {
    return;
  }

  await run('Placing capture…', async () => {
    const exported = await client.captures.export(captureId, { format: 'png' });
    // The manifest only allows the API origin, so bytes come from the API, not storage.
    const bytes = new Uint8Array(await client.captures.downloadExport(captureId));
    postToPlugin({
      type: 'place-image',
      payload: { bytes, width: exported.width, height: exported.height },
    });
  });
}

async function importSelection(bytes: Uint8Array, name: string) {
  const client = createClient();
  if (!client) {
    return;
  }

  await run('Uploading to SnapGlow…', async () => {
    const blob = new Blob([Uint8Array.from(bytes)], { type: 'image/png' });
    const uploaded = await client.captures.upload(blob, { title: name, tags: ['figma'] });

    const state = buildDesignCaptureState(
      uploaded.documentState.screenshotWidth,
      uploaded.documentState.screenshotHeight
    );

    setStatus('Beautifying…');
    await client.captures.beautify(uploaded.id, state, { title: name });
    await client.captures.export(uploaded.id, { format: 'png' });
    const exportBytes = await client.captures.downloadExport(uploaded.id);

    previewEl.hidden = false;
    if (previewEl.src.startsWith('blob:')) {
      URL.revokeObjectURL(previewEl.src);
    }
    previewEl.src = URL.createObjectURL(new Blob([exportBytes], { type: 'image/png' }));
    setStatus('Imported.');
  });
}

saveConfigButton.onclick = () => {
  postToPlugin({ type: 'save-config', payload: getConfig() });
};

importButton.onclick = () => {
  if (!createClient()) {
    return;
  }
  setStatus('Exporting selection…');
  postToPlugin({ type: 'export-selection' });
};

refreshButton.onclick = () => {
  void refreshCaptures();
};

window.onmessage = (event: MessageEvent) => {
  const message = event.data.pluginMessage as PluginMessage | undefined;
  if (!message) {
    return;
  }

  if (message.type === 'error') {
    setStatus(message.message);
  }

  if (message.type === 'config') {
    if (message.config) {
      apiKeyInput.value = message.config.apiKey;
      baseUrlInput.value = message.config.baseUrl;
      void refreshCaptures();
    }
  }

  if (message.type === 'config-saved') {
    setStatus('Saved.');
    void refreshCaptures();
  }

  if (message.type === 'selection-bytes') {
    void importSelection(message.bytes, message.name);
  }

  if (message.type === 'image-placed') {
    setStatus('Capture placed on canvas.');
  }
};

postToPlugin({ type: 'load-config' });
