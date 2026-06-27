const params = new URLSearchParams(window.location.search);
const sessionId = params.get('session') ?? '';

const connectButton = document.getElementById('connectNotion') as HTMLButtonElement;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
const loadCapturesButton = document.getElementById('loadCaptures') as HTMLButtonElement;
const capturesEl = document.getElementById('captures') as HTMLDivElement;
const pageSelect = document.getElementById('pageSelect') as HTMLSelectElement;
const insertButton = document.getElementById('insertEmbed') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

let selectedCaptureId: string | null = null;

function setStatus(message: string) {
  statusEl.textContent = message;
}

connectButton.onclick = () => {
  window.location.href = '/oauth/start';
};

async function loadPages() {
  if (!sessionId) {
    return;
  }
  const response = await fetch(`/api/pages?session=${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    setStatus('Failed to load Notion pages.');
    return;
  }
  const payload = (await response.json()) as { pages: Array<{ id: string; url: string }> };
  pageSelect.innerHTML = '';
  for (const page of payload.pages) {
    const option = document.createElement('option');
    option.value = page.id;
    option.textContent = page.url;
    pageSelect.appendChild(option);
  }
  insertButton.disabled = !selectedCaptureId || pageSelect.value === '';
}

loadCapturesButton.onclick = async () => {
  const apiKey = apiKeyInput.value.trim();
  const baseUrl = baseUrlInput.value.trim();
  if (!apiKey) {
    setStatus('Enter your SnapGlow API key.');
    return;
  }

  const response = await fetch(
    `/api/captures?apiKey=${encodeURIComponent(apiKey)}&baseUrl=${encodeURIComponent(baseUrl)}`
  );
  if (!response.ok) {
    setStatus('Failed to load captures.');
    return;
  }

  const payload = (await response.json()) as {
    items: Array<{ id: string; title: string | null; createdAt: string }>;
  };

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
  if (!selectedCaptureId || !pageSelect.value || !sessionId) {
    return;
  }

  insertButton.disabled = true;
  setStatus('Publishing and inserting embed…');

  const response = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: sessionId,
      pageId: pageSelect.value,
      apiKey: apiKeyInput.value.trim(),
      baseUrl: baseUrlInput.value.trim(),
      captureId: selectedCaptureId,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    setStatus(payload.error ?? 'Embed failed.');
    insertButton.disabled = false;
    return;
  }

  const payload = (await response.json()) as { embedUrl: string };
  setStatus(`Embed inserted: ${payload.embedUrl}`);
  insertButton.disabled = false;
};

if (sessionId) {
  void loadPages();
  setStatus('Connected to Notion.');
}
