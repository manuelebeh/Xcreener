#!/usr/bin/env bash
# Basic security scan for SnapGlow API (T-020). Non-blocking; documents findings in security-audit report.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== SnapGlow API security scan =="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo ""

echo "-- pnpm audit (api workspace) --"
pnpm --filter @snapglow/api audit --audit-level=moderate 2>&1 || true
echo ""

echo "-- Dependency review: @fastify/helmet present --"
rg -q '@fastify/helmet' apps/api/package.json && echo "OK: helmet configured" || echo "WARN: helmet missing"
echo ""

echo "-- CORS origins env documented --"
rg -q 'CORS_ORIGINS' apps/api/.env.example && echo "OK: CORS_ORIGINS in .env.example" || echo "WARN: CORS_ORIGINS missing"
echo ""

echo "-- Public unauthenticated routes (manual review required) --"
echo "  GET /health"
echo "  GET /v1/shares/:token"
echo "  GET /v1/embeds/:token"
echo "  GET /openapi.json, GET /docs"
echo "  POST /v1/billing/webhook (Stripe signature required)"
echo ""

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "-- OWASP ZAP baseline (optional; requires running API on localhost:8787) --"
  if curl -sf "http://localhost:8787/health" >/dev/null 2>&1; then
    if docker image inspect ghcr.io/zaproxy/zaproxy:stable >/dev/null 2>&1 || docker pull ghcr.io/zaproxy/zaproxy:stable; then
      docker run --rm -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
        -t "http://host.docker.internal:8787/health" \
        -r /dev/null 2>&1 || echo "ZAP reported issues — see security-audit-2026-06.md"
    fi
  else
    echo "SKIP: API not running on :8787 (start with mise run dev:api)"
  fi
else
  echo "SKIP: Docker not available for ZAP baseline"
fi

echo ""
echo "Done. Full checklist: docs/internal/audits/security-audit-2026-06.md (local, not tracked)"
