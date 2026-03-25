import { NextResponse } from 'next/server';

/**
 * Legacy URL-only upload endpoint — **removed**.
 *
 * Previously accepted JSON with an external `videoUrl` and created rows with ad-hoc
 * processing transitions. All uploads must use the direct pipeline:
 * POST /api/upload/init → PUT to presigned URL → POST /api/videos/upload/complete
 * (see `@/lib/upload-client` performDirectUpload).
 */

const DEPRECATED_JSON = {
  ok: false,
  error: 'DEPRECATED',
  message:
    'POST /api/videos/upload is no longer supported. Use direct upload: POST /api/upload/init, PUT the file to the returned uploadUrl, then POST /api/videos/upload/complete.',
  migration: {
    init: 'POST /api/upload/init',
    complete: 'POST /api/videos/upload/complete',
    client: '@/lib/upload-client performDirectUpload',
  },
} as const;

function gone(): NextResponse {
  return NextResponse.json(DEPRECATED_JSON, {
    status: 410,
    headers: {
      'Cache-Control': 'no-store',
      Link: '</api/upload/init>; rel="successor-version"',
    },
  });
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}

export async function PUT() {
  return gone();
}

export async function PATCH() {
  return gone();
}

export async function DELETE() {
  return gone();
}
