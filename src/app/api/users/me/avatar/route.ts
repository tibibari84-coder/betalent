import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteStorageObject, extractStorageKeyFromUrl, isStorageConfigured, uploadAvatar } from '@/lib/storage';

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export async function POST(request: Request) {
  try {
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { ok: false, message: 'Avatar upload not configured (R2 required)' },
        { status: 503 }
      );
    }

    let user;
    try {
      user = await requireAuth();
    } catch (e) {
      if (e instanceof Error && e.message === 'Unauthorized') {
        return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
      }
      throw e;
    }

    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatarUrl: true },
    });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (e) {
      console.error('[avatar] formData parse', e);
      return NextResponse.json({ ok: false, message: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') ?? formData.get('avatar');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, message: 'No file provided' }, { status: 400 });
    }
    const blob = file instanceof Blob ? file : (file as { arrayBuffer?: () => Promise<ArrayBuffer> });
    if (!blob.arrayBuffer) {
      return NextResponse.json({ ok: false, message: 'Invalid file' }, { status: 400 });
    }

    const mimeType = (blob as { type?: string }).type?.toLowerCase()?.trim() ?? '';
    if (!mimeType || !ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid file type. Use JPG, PNG, or WebP.' },
        { status: 400 }
      );
    }

    const size = (blob as { size?: number }).size ?? 0;
    if (size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, message: 'File too large. Max 20MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const contentType = mimeType || 'image/jpeg';

    let avatarUrl: string;
    try {
      const result = await uploadAvatar(user.id, buffer, contentType);
      avatarUrl = result.url;
    } catch (e) {
      console.error('[avatar] R2 upload', e);
      return NextResponse.json(
        { ok: false, message: `Upload failed: ${errMsg(e)}` },
        { status: 500 }
      );
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    } catch (e) {
      console.error('[avatar] prisma update', e);
      return NextResponse.json(
        { ok: false, message: `Could not update profile: ${errMsg(e)}` },
        { status: 500 }
      );
    }

    if (existing?.avatarUrl) {
      const oldKey = extractStorageKeyFromUrl(existing.avatarUrl);
      if (oldKey) {
        const deleted = await deleteStorageObject(oldKey);
        if (!deleted.ok) {
          console.error('[avatar] failed to delete old avatar object', {
            userId: user.id,
            oldKey,
            error: deleted.error,
          });
        } else {
          console.info('[avatar] deleted old avatar object', { userId: user.id, oldKey });
        }
      }
    }

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (e) {
    console.error('[avatar] unexpected', e);
    return NextResponse.json(
      { ok: false, message: `Upload error: ${errMsg(e)}` },
      { status: 500 }
    );
  }
}
