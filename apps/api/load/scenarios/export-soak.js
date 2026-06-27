import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 1,
  iterations: 1,
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8787';
const apiKey = __ENV.API_KEY;
const captureId = __ENV.CAPTURE_ID;

export default function exportSoak() {
  if (!apiKey || !captureId) {
    return;
  }

  const response = http.post(
    `${baseUrl}/v1/public/captures/${captureId}/export`,
    JSON.stringify({ format: 'png', quality: 0.92 }),
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'export' },
    }
  );

  check(response, {
    'export ok or rate limited': (r) => r.status === 200 || r.status === 429,
  });
}
