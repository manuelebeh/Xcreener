import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8787';
const apiKey = __ENV.API_KEY;
const captureId = __ENV.CAPTURE_ID;

export default function beautify() {
  if (!apiKey || !captureId) {
    return;
  }

  const payload = JSON.stringify({
    documentState: {
      layout: {
        padding: 24,
        background: { type: 'solid', color: '#1a1a2e' },
        borderRadius: 12,
      },
      annotations: [],
    },
  });

  const response = http.patch(`${baseUrl}/v1/public/captures/${captureId}`, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'beautify' },
  });

  check(response, { 'beautify ok': (r) => r.status === 200 || r.status === 429 });
  sleep(1);
}
