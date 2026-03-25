#!/usr/bin/env bash
# Run Prisma migrations against Neon (or any remote Postgres).
# Do not use root .env localhost DATABASE_URL for production DB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NEON_ENV="${ROOT}/.env.neon"
if [[ ! -f "${NEON_ENV}" ]]; then
  echo "Missing ${NEON_ENV}" >&2
  echo "Create it with: DATABASE_URL=\"postgresql://...neon.tech/...?sslmode=require\"" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "${NEON_ENV}"
set +a
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is empty in .env.neon" >&2
  exit 1
fi
cd "${ROOT}"
npx prisma migrate deploy
npx prisma generate
