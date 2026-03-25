#!/usr/bin/env bash
# Next.js + Cloudflare quick tunnel (same terminal). Ctrl+C stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

cleanup() {
  [[ -n "${NEXT_PID:-}" ]] && kill "$NEXT_PID" 2>/dev/null || true
  [[ -n "${CF_PID:-}" ]] && kill "$CF_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting Next.js on http://localhost:3000 ..."
npm run dev &
NEXT_PID=$!

echo "Waiting for :3000 ..."
for _ in {1..90}; do
  if curl -sf -o /dev/null "http://127.0.0.1:3000/"; then
    echo "Next.js is ready."
    break
  fi
  sleep 1
done

echo ""
echo "=== Cloudflare tunnel — copy the https://....trycloudflare.com URL below ==="
echo "Google Console → Authorized redirect URI:"
echo "  https://YOUR-SUBDOMAIN.trycloudflare.com/api/auth/google/callback"
echo "JavaScript origin: https://YOUR-SUBDOMAIN.trycloudflare.com"
echo ""

cloudflared tunnel --url http://localhost:3000 &
CF_PID=$!
wait "$CF_PID"
