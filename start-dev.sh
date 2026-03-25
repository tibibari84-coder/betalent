#!/bin/bash
# BeTalent dev server - auto-restart on crash
# Phone / Google OAuth via tunnel: npm run dev:tunnel (Next + cloudflared, one terminal)
cd "$(dirname "$0")"
echo "Starting BeTalent dev server (auto-restart enabled)..."
echo "Press Ctrl+C to stop."
while true; do
  npm run dev
  echo ""
  echo "Server stopped. Restarting in 2 seconds..."
  sleep 2
done
