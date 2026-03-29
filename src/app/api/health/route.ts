import { NextResponse } from 'next/server';

/**
 * Lightweight liveness for probes and dashboards. No DB (avoids pool churn on frequent pings).
 * Build metadata only when HEALTH_INCLUDE_BUILD_INFO=1 (reduces public fingerprinting).
 */
export async function GET() {
  const detailed = process.env.HEALTH_INCLUDE_BUILD_INFO === '1';
  return NextResponse.json({
    ok: true,
    service: 'betalent',
    ts: new Date().toISOString(),
    ...(detailed && {
      release:
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.trim() ||
        null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    }),
  });
}
