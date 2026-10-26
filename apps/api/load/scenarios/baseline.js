import http from 'k6/http';
import { check, sleep } from 'k6';

// Local defaults are strict. CI shares one small runner between k6, the API and its services, so it passes looser limits.
const healthP95 = Number(__ENV.HEALTH_P95_MS || 200);
const readP95 = Number(__ENV.READ_P95_MS || 500);

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-arrival-rate',
      rate: 17,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:health}': [`p(95)<${healthP95}`],
    'http_req_duration{endpoint:list}': [`p(95)<${readP95}`],
    'http_req_duration{endpoint:get}': [`p(95)<${readP95}`],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:8787';
const apiKey = __ENV.API_KEY;
const captureId = __ENV.CAPTURE_ID;

export default function baseline() {
  const authHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};

  const health = http.get(`${baseUrl}/health`, { tags: { endpoint: 'health' } });
  check(health, { 'health ok': (r) => r.status === 200 });

  if (apiKey) {
    const list = http.get(`${baseUrl}/v1/public/captures?limit=20`, {
      headers: authHeaders,
      tags: { endpoint: 'list' },
    });
    check(list, { 'list ok': (r) => r.status === 200 });
  }

  if (apiKey && captureId) {
    const detail = http.get(`${baseUrl}/v1/public/captures/${captureId}`, {
      headers: authHeaders,
      tags: { endpoint: 'get' },
    });
    check(detail, { 'get ok': (r) => r.status === 200 });
  }

  sleep(0.01);
}
