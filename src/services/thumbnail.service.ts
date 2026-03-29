/**
 * Thumbnail generation for uploaded videos.
 * Extracts a representative frame (e.g. at 1s) via ffmpeg and uploads to storage.
 * If ffmpeg is unavailable or fails, the pipeline marks the video as PROCESSING_FAILED.
 */

import { spawn } from 'child_process';
import { prisma } from '@/lib/prisma';
import { uploadThumbnail } from '@/lib/storage';
import { assertFfmpegAvailable } from '@/lib/ffmpeg';

const FRAME_SEC = 1;
const JPEG_QUALITY = 4; // 2–31, lower = better quality

export type ThumbnailResult = { ok: true; thumbnailUrl: string } | { ok: false; error: string };

/**
 * Extract a single JPEG frame from a video URL and upload to storage.
 * Requires ffmpeg on PATH or `FFMPEG_PATH`. Uses -ss before -i for fast seek.
 */
export async function generateAndUploadThumbnail(
  videoId: string,
  videoUrl: string,
  creatorId: string
): Promise<ThumbnailResult> {
  if (!videoUrl || typeof videoUrl !== 'string') {
    return { ok: false, error: 'Invalid input path' };
  }
  return new Promise((resolve) => {
    const ffmpegCmd = process.env.FFMPEG_PATH || 'ffmpeg';
    const args = [
      '-ss',
      String(FRAME_SEC),
      '-i',
      videoUrl,
      '-vframes',
      '1',
      '-f',
      'image2',
      '-q:v',
      String(JPEG_QUALITY),
      '-y',
      'pipe:1',
    ];
    // Safe: ffmpeg command is controlled and inputs are validated
    const proc = spawn(ffmpegCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks: Buffer[] = [];
    proc.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk));

    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const ffmpegMissingHint = msg.toLowerCase().includes('enoent') ? 'FFMPEG_NOT_AVAILABLE' : 'FFMPEG_SPAWN_ERROR';
      resolve({ ok: false, error: `${ffmpegMissingHint}: ${msg}` });
    });

    proc.on('close', async (code) => {
      if (code !== 0) {
        const msg = stderr.slice(-500) || `ffmpeg exited ${code}`;
        resolve({ ok: false, error: msg });
        return;
      }
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        resolve({ ok: false, error: 'No frame extracted' });
        return;
      }
      try {
        const { url } = await uploadThumbnail(creatorId, videoId, buffer, 'image/jpeg');
        resolve({ ok: true, thumbnailUrl: url });
      } catch (e) {
        resolve({
          ok: false,
          error: e instanceof Error ? e.message : 'Upload failed',
        });
      }
    });
  });
}

/**
 * Run thumbnail generation for a video and update DB.
 * Pipeline: PENDING_PROCESSING → GENERATING_THUMBNAIL → (thumbnail done) → PROCESSING_AUDIO or PROCESSING_FAILED.
 */
export async function runThumbnailPipelineStep(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, videoUrl: true, creatorId: true, processingStatus: true },
  });
  if (!video?.videoUrl) return;
  if (video.processingStatus !== 'PENDING_PROCESSING' && video.processingStatus !== 'GENERATING_THUMBNAIL') {
    return;
  }

  // Hard dependency: without ffmpeg we must fail safely and deterministically.
  try {
    assertFfmpegAvailable();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: 'PROCESSING_FAILED',
        processingError: msg,
        processingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    return;
  }

  if (video.processingStatus === 'PENDING_PROCESSING') {
    await prisma.video.update({
      where: { id: videoId },
      data: { processingStatus: 'GENERATING_THUMBNAIL', updatedAt: new Date() },
    });
  }

  const result = await generateAndUploadThumbnail(videoId, video.videoUrl, video.creatorId);

  if (result.ok) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        thumbnailUrl: result.thumbnailUrl,
        processingStatus: 'PROCESSING_AUDIO',
        processingError: null,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        processingStatus: 'PROCESSING_FAILED',
        processingError: result.error,
        processingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
