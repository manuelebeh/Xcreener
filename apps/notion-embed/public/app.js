const connectButton = document.getElementById('connectNotion');
const apiKeyInput = document.getElementById('apiKey');
const loadCapturesButton = document.getElementById('loadCaptures');
const capturesEl = document.getElementById('captures');
const pageSelect = document.getElementById('pageSelect');
const insertButton = document.getElementById('insertEmbed');
const statusEl = document.getElementById('status');

let selectedCaptureId = null;

function setStatus(message) {
  statusEl.textContent = message;
}

function postJson(path, body) {
  return fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

connectButton.onclick = () => {
  window.location.href = '/oauth/start';
};

// The Notion session lives in an HttpOnly cookie set by /oauth/callback.
async function loadPages() {
  const response = await fetch('/api/pages');
  if (response.status === 401) {
    return;
  }
  if (!response.ok) {
    setStatus('Failed to load Notion pages.');
    return;
  }
  const payload = await response.json();
  pageSelect.innerHTML = '';
  for (const page of payload.pages) {
    const option = document.createElement('option');
    option.value = page.id;
    option.textContent = page.url;
    pageSelect.appendChild(option);
  }
  insertButton.disabled = !selectedCaptureId || pageSelect.value === '';
  setStatus('Connected to Notion.');
}

loadCapturesButton.onclick = async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    setStatus('Enter your Xcreener API key.');
    return;
  }

  const response = await postJson('/api/captures', { apiKey });
  if (!response.ok) {
    setStatus('Failed to load captures.');
    return;
  }

  const payload = await response.json();

  capturesEl.innerHTML = '';
  for (const item of payload.items) {
    const div = document.createElement('div');
    div.className = 'capture';
    div.textContent = `${item.title ?? 'Untitled'} · ${new Date(item.createdAt).toLocaleString()}`;
    div.onclick = () => {
      selectedCaptureId = item.id;
      for (const child of capturesEl.children) {
        child.classList.remove('selected');
      }
      div.classList.add('selected');
      insertButton.disabled = pageSelect.value === '';
    };
    capturesEl.appendChild(div);
  }

  setStatus(`Loaded ${payload.items.length} captures.`);
};

insertButton.onclick = async () => {
  if (!selectedCaptureId || !pageSelect.value) {
    return;
  }

  insertButton.disabled = true;
  setStatus('Publishing and inserting embed…');

  const response = await postJson('/api/embed', {
    pageId: pageSelect.value,
    apiKey: apiKeyInput.value.trim(),
    captureId: selectedCaptureId,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    setStatus(payload.error ?? 'Embed failed.');
    insertButton.disabled = false;
    return;
  }

  const payload = await response.json();
  setStatus(`Embed inserted: ${payload.embedUrl}`);
  insertButton.disabled = false;
};

void loadPages();
