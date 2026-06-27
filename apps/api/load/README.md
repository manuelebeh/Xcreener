# SnapGlow API load tests (T-019)

[k6](https://k6.io/) scenarios targeting **1000+ requests/min** (~17 rps sustained).

## Prerequisites

```bash
brew install k6   # macOS
# or: https://k6.io/docs/get-started/installation/

mise run dev:api  # Postgres + Redis + MinIO + API on :8787
```

Raise general rate limit for load env (not production):

```bash
# apps/api/.env.local
API_RATE_LIMIT_GENERAL=2000
```

## Seed fixture

```bash
cd apps/api
dotenv -e .env.local -- tsx scripts/seed-load-fixture.ts
```

Export the printed variables, then run k6:

```bash
export LOAD_TEST_API_KEY=sg_live_...
export LOAD_TEST_CAPTURE_ID=...
export LOAD_TEST_BASE_URL=http://localhost:8787
```

## Scenarios

| Script | Purpose |
|--------|---------|
| `scenarios/baseline.js` | 17 rps × 5 min — health + list + get capture |
| `scenarios/beautify.js` | PATCH beautify at lower rate |
| `scenarios/export-soak.js` | Single export (hourly cap) |

## Run baseline (Sprint criterion)

```bash
k6 run -e BASE_URL="$LOAD_TEST_BASE_URL" \
  -e API_KEY="$LOAD_TEST_API_KEY" \
  -e CAPTURE_ID="$LOAD_TEST_CAPTURE_ID" \
  load/scenarios/baseline.js
```

**Pass criteria:** `http_req_failed < 1%`, `http_req_duration{p(95)} < 500ms` on read routes.

Or via mise:

```bash
mise run load:api
```

## CI

`.github/workflows/api-load.yml` — weekly + manual `workflow_dispatch`.
