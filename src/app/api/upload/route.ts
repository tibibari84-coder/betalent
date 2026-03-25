/**
 * POST /api/upload — legacy FormData upload removed.
 *
 * All uploads use the R2 direct pipeline:
 * POST /api/upload/init → PUT to presigned URL → POST /api/videos/upload/complete
 * (see performDirectUpload in @/lib/upload-client).
 *
 * Local/mock storage has been removed. R2 is required.
 */

import { NextResponse } from 'next/server';
import { isStorageConfigured } from '@/lib/storage';

export async function POST() {
  if (isStorageConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'DEPRECATED',
        message: 'Use direct upload: POST /api/upload/init, PUT file to uploadUrl, then POST /api/videos/upload/complete.',
        migration: {
          init: 'POST /api/upload/init',
          complete: 'POST /api/videos/upload/complete',
          client: '@/lib/upload-client performDirectUpload',
        },
      },
      {
        status: 410,
        headers: {
          'Cache-Control': 'no-store',
          Link: '</api/upload/init>; rel="successor-version"',
        },
      }
    );
  }
  return NextResponse.json(
    { ok: false, message: 'Direct upload is not configured. Set R2_* env vars.' },
    { status: 503 }
  );
}
