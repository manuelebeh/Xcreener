const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
const saveConfigButton = document.getElementById('saveConfig') as HTMLButtonElement;
const importButton = document.getElementById('importSelection') as HTMLButtonElement;
const refreshButton = document.getElementById('refreshCaptures') as HTMLButtonElement;
const capturesEl = document.getElementById('captures') as HTMLDivElement;
const previewEl = document.getElementById('preview') as HTMLImageElement;

interface StoredConfig {
  apiKey: string;
  baseUrl: string;
}

function getConfig(): StoredConfig {
  return {
    apiKey: apiKeyInput.value.trim(),
    baseUrl: baseUrlInput.value.trim() || 'http://localhost:8787',
  };
}

saveConfigButton.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'save-config', payload: getConfig() } }, '*');
};

importButton.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'import-selection', payload: getConfig() } }, '*');
};

refreshButton.onclick = () => {
  parent.postMessage({ pluginMessage: { type: 'list-captures', payload: getConfig() } }, '*');
};

window.onmessage = (event: MessageEvent) => {
  const message = event.data.pluginMessage as {
    type: string;
    message?: string;
    previewUrl?: string;
    items?: Array<{ id: string; title: string; createdAt: string }>;
  };

  if (!message) {
    return;
  }

  if (message.type === 'error') {
    capturesEl.textContent = message.message ?? 'Error';
    return;
  }

  if (message.type === 'import-complete' && message.previewUrl) {
    previewEl.hidden = false;
    previewEl.src = message.previewUrl;
  }

  if (message.type === 'captures-list' && message.items) {
    capturesEl.innerHTML = '';
    for (const item of message.items) {
      const div = document.createElement('div');
      div.className = 'capture-item';
      div.textContent = `${item.title} · ${new Date(item.createdAt).toLocaleDateString()}`;
      div.onclick = () => {
        parent.postMessage(
          { pluginMessage: { type: 'export-to-canvas', payload: { ...getConfig(), captureId: item.id } } },
          '*'
        );
      };
      capturesEl.appendChild(div);
    }
  }

  if (message.type === 'export-complete') {
    capturesEl.textContent = 'Capture placed on canvas.';
  }
};

parent.postMessage({ pluginMessage: { type: 'list-captures', payload: getConfig() } }, '*');
