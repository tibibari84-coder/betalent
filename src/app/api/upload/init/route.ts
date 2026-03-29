/**
 * POST /api/upload/init
 * Start direct video upload: validate input, create Video record, return presigned upload URL.
 * Client then PUTs the file to uploadUrl and calls POST /api/videos/upload/complete.
 */

import { NextResponse } from 'next/server';
import { requireVerifiedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { RATE_LIMIT_UPLOAD_INIT_PER_HOUR } from '@/constants/api-rate-limits';
import { isStorageConfigured } from '@/lib/storage';
import { getPresignedUploadUrl } from '@/lib/storage';
import { buildVideoStorageKey, getExtensionFromMime } from '@/lib/storage';
import {
  isAllowedMimeType,
  MAX_PLATFORM_UPLOAD_DURATION_SEC,
  MAX_VIDEO_FILE_SIZE,
  normalizeVideoMimeType,
  UPLOAD_PRESIGN_EXPIRES_SEC,
} from '@/constants/upload';
import { getLiveChallengeRecordingCapSec } from '@/constants/recording-modes';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { logOpsEvent } from '@/lib/ops-events';
import { isVocalPerformanceStyleSlug } from '@/constants/vocal-style-catalog';
import { blockDisallowedMutationOrigin } from '@/lib/mutation-origin';
import { isSafeUploadFilename, stripUnsafeTextControls } from '@/lib/security/sanitize';

const CONTENT_TYPES = ['ORIGINAL', 'COVER', 'REMIX'] as const;
const COMMENT_PERMISSIONS = ['EVERYONE', 'FOLLOWERS', 'FOLLOWING', 'OFF'] as const;

const initSchema = z.object({
  /** New mobile contract */
  caption: z.string().max(500).optional(),
  hashtags: z.union([z.string(), z.array(z.string())]).optional(),
  vocalStyle: z.string().min(1).optional(),
  /** Backward-compatible legacy contract */
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional(),
  categorySlug: z.string().min(1).optional(),
  /** Required at init — client must send explicit ORIGINAL | COVER | REMIX (upload UI forces user choice for O/C). */
  contentType: z.enum(CONTENT_TYPES),
  commentPermission: z.enum(COMMENT_PERMISSIONS).optional(),
  /** Optional cover attribution when contentType is COVER (MVP: may be empty). */
  coverOriginalArtistName: z.string().max(200).optional(),
  coverSongTitle: z.string().max(200).optional(),
  filename: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  durationSec: z.number().int().min(1),
  challengeSlug: z.string().min(1).max(120).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export async function POST(req: Request) {
  try {
    const originDeny = blockDisallowedMutationOrigin(req);
    if (originDeny) return originDeny;

    const user = await requireVerifiedUser();
    if (!(await checkRateLimit('upload-init-user', user.id, RATE_LIMIT_UPLOAD_INIT_PER_HOUR, 60 * 60 * 1000))) {
      logOpsEvent('upload_failed', { userId: user.id, errorCode: 'RATE_LIMIT_UPLOAD_INIT' });
      return NextResponse.json(
        { ok: false, message: 'Too many upload starts. Please try again later.', code: 'RATE_LIMIT_UPLOAD_INIT' },
        { status: 429 }
      );
    }
    if (!isStorageConfigured()) {
      return NextResponse.json(
        { ok: false, message: 'Direct upload is not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const parsed = initSchema.parse(body);
    if (!isSafeUploadFilename(parsed.filename)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid filename. Use a simple name without paths or special control characters.' },
        { status: 400 }
      );
    }
    const caption = stripUnsafeTextControls(parsed.caption?.trim() ?? '');
    const title = stripUnsafeTextControls(
      (parsed.title?.trim() || caption.split('\n').map((line) => line.trim()).find(Boolean) || 'New performance').slice(0, 150)
    );
    const descriptionRaw = parsed.description?.trim() || caption || undefined;
    const description = descriptionRaw != null ? stripUnsafeTextControls(descriptionRaw) : undefined;
    const categorySlug = parsed.vocalStyle?.trim() || parsed.categorySlug?.trim() || '';
    if (!categorySlug) {
      return NextResponse.json({ ok: false, message: 'Invalid style' }, { status: 400 });
    }
    const mimeTypeNorm = normalizeVideoMimeType(parsed.mimeType);

    if (!isAllowedMimeType(mimeTypeNorm)) {
      return NextResponse.json(
        { ok: false, message: 'Invalid file type. Use MP4, MOV, M4V, or WebM.' },
        { status: 400 }
      );
    }
    if (parsed.fileSize > MAX_VIDEO_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, message: `File too large. Max ${Math.round(MAX_VIDEO_FILE_SIZE / 1024 / 1024)} MB.` },
        { status: 400 }
      );
    }

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });
    if (!category) {
      return NextResponse.json({ ok: false, message: 'Invalid style' }, { status: 400 });
    }

    let limit = MAX_PLATFORM_UPLOAD_DURATION_SEC;
    if (parsed.challengeSlug) {
      const ch = await prisma.challenge.findUnique({
        where: { slug: parsed.challengeSlug },
        select: { status: true, maxDurationSec: true },
      });
      if (!ch) {
        return NextResponse.json({ ok: false, message: 'Invalid challenge' }, { status: 400 });
      }
      if (ch.status !== 'ENTRY_OPEN') {
        return NextResponse.json(
          { ok: false, message: 'Challenge is not accepting entries' },
          { status: 400 }
        );
      }
      limit = getLiveChallengeRecordingCapSec(ch.maxDurationSec);
    }
    if (parsed.durationSec > limit) {
      return NextResponse.json(
        { ok: false, message: `Max duration ${limit}s` },
        { status: 400 }
      );
    }

    const contentType = parsed.contentType;
    const contentLicensingEligible = contentType === 'ORIGINAL';
    const coverOriginalArtistName =
      contentType === 'COVER'
        ? stripUnsafeTextControls(parsed.coverOriginalArtistName?.trim() || '') || null
        : null;
    const coverSongTitle =
      contentType === 'COVER' ? stripUnsafeTextControls(parsed.coverSongTitle?.trim() || '') || null : null;

    const userPrefs = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultCommentPermission: true },
    });
    const commentPermission =
      parsed.commentPermission ?? userPrefs?.defaultCommentPermission ?? 'EVERYONE';

    const publicId = `betalent/${user.id}/${Date.now()}`;
    const performanceStyle = isVocalPerformanceStyleSlug(category.slug) ? category.slug : null;
    const video = await prisma.video.create({
      data: {
        creatorId: user.id,
        categoryId: category.id,
        title,
        description: description ?? null,
        publicId,
        durationSec: parsed.durationSec,
        fileSize: parsed.fileSize,
        mimeType: mimeTypeNorm,
        performanceStyle,
        contentType,
        coverOriginalArtistName,
        coverSongTitle,
        commentPermission,
        contentLicensingEligible,
        uploadStatus: 'UPLOADING',
        processingStatus: 'PENDING_PROCESSING',
        moderationStatus: 'PENDING',
        status: 'PROCESSING',
      },
    });

    const ext = getExtensionFromMime(mimeTypeNorm);
    const storageKey = buildVideoStorageKey(user.id, video.id, ext);

    await prisma.video.update({
      where: { id: video.id },
      data: { storageKey },
    });

    let uploadUrl: string;
    let expiresAt: string;
    try {
      const presigned = await getPresignedUploadUrl(
        storageKey,
        mimeTypeNorm,
        UPLOAD_PRESIGN_EXPIRES_SEC
      );
      uploadUrl = presigned.uploadUrl;
      expiresAt = presigned.expiresAt;
    } catch (error) {
      logger.error('upload_init_presign_failed', {
        videoId: video.id,
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      logOpsEvent('upload_failed', {
        userId: user.id,
        videoId: video.id,
        errorCode: 'PRESIGN_FAILED',
      });
      await prisma.video.delete({ where: { id: video.id } }).catch((deleteError) => {
        logger.error('upload_init_cleanup_failed', {
          videoId: video.id,
          error: deleteError instanceof Error ? deleteError.message : String(deleteError),
        });
      });
      throw error;
    }

    logOpsEvent('upload_started', {
      userId: user.id,
      videoId: video.id,
      mimeType: mimeTypeNorm,
      durationSec: parsed.durationSec,
    });
    logOpsEvent('publish_started', {
      userId: user.id,
      videoId: video.id,
    });

    return NextResponse.json({
      ok: true,
      videoId: video.id,
      uploadUrl,
      storageKey,
      expiresAt,
      contentType: mimeTypeNorm,
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, message: 'Login required' }, { status: 401 });
    }
    if (e instanceof Error && e.message === 'Email not verified') {
      return NextResponse.json(
        { ok: false, code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before uploading performances.' },
        { status: 403 }
      );
    }
    if (e instanceof z.ZodError) {
      const msg = e.errors[0]?.message ?? 'Invalid input';
      return NextResponse.json({ ok: false, message: msg, errors: e.errors }, { status: 400 });
    }
    logger.error('upload_init_unhandled', { error: e instanceof Error ? e.message : String(e) });
    logOpsEvent('upload_failed', { errorCode: 'UPLOAD_INIT_UNHANDLED' });
    return NextResponse.json({ ok: false, message: 'Upload init failed', code: 'UPLOAD_INIT_FAILED' }, { status: 500 });
  }
}
