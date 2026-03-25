/**
 * BETALENT premium upload audio processing – two-pass loudness, limiter, re-mux.
 * Singer-first, production-quality. Runs after thumbnail, before audio analysis.
 *
 * Pipeline: FFmpeg two-pass loudnorm (EBU R128 -14 LUFS, -1 dBTP) + highpass + re-mux.
 * Two-pass ensures accurate integrated loudness; single-pass can overshoot/undershoot.
 * Requires ffmpeg on PATH or `FFMPEG_PATH`.
 */

import { spawn } from 'child_process';
import { readFileSync, unlinkSync, existsSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { assertFfmpegAvailable, getFfmpegCommand } from '@/lib/ffmpeg';
import { buildVideoStorageKey, deleteStorageObject, extractStorageKeyFromUrl, uploadProcessedVideo } from '@/lib/storage';
import {
  TARGET_LUFS,
  PEAK_LIMIT_DB,
  LOUDNESS_RANGE,
  AAC_BITRATE,
  OUTPUT_SAMPLE_RATE,
  HIGHPASS_HZ,
  PROCESSING_TIMEOUT_MS,
} from '@/constants/audio-processing';

export type AudioProcessingPipelineResult =
  | { ok: true; videoUrl: string }
  | { ok: false; error: string };

/** Parsed loudnorm first-pass JSON from FFmpeg stderr. */
interface LoudnormMeasure {
  input_i: string;
  input_tp: string;
  input_lra: string;
  input_thresh: string;
  target_offset: string;
}

/** Run FFmpeg with timeout. Kills process if it exceeds PROCESSING_TIMEOUT_MS. */
function runFfmpegWithTimeout(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ffmpegCmd = getFfmpegCommand();
    const proc = spawn(ffmpegCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (ch: Buffer) => {
      stderr += ch.toString();
    });
    proc.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      if (!settled) {
        settled = true;
        resolve({ code: code ?? 1, stderr });
      }
    });

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill('SIGKILL');
        reject(new Error(`FFmpeg timeout after ${PROCESSING_TIMEOUT_MS}ms`));
      }
    }, PROCESSING_TIMEOUT_MS);
  });
}

/** Extract loudnorm JSON from FFmpeg stderr. Format: [Parsed_loudnorm_0 @ 0x...] { ... } */
function parseLoudnormJson(stderr: string): LoudnormMeasure | null {
  const start = stderr.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = start;
  for (let i = start; i < stderr.length; i++) {
    const c = stderr[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const jsonStr = stderr.slice(start, end + 1);
  try {
    const obj = JSON.parse(jsonStr) as Record<string, string>;
    const input_i = obj.input_i;
    const input_tp = obj.input_tp;
    const input_lra = obj.input_lra;
    const input_thresh = obj.input_thresh;
    const target_offset = obj.target_offset;
    if (
      input_i == null ||
      input_tp == null ||
      input_lra == null ||
      input_thresh == null ||
      target_offset == null
    ) {
      return null;
    }
    return { input_i, input_tp, input_lra, input_thresh, target_offset };
  } catch {
    return null;
  }
}

/** Build first-pass filter: measure only, no output. */
function buildFirstPassFilter(): string {
  const parts: string[] = [];
  if (HIGHPASS_HZ > 0) {
    parts.push(`highpass=f=${HIGHPASS_HZ}`);
  }
  parts.push(
    `loudnorm=I=${TARGET_LUFS}:TP=${PEAK_LIMIT_DB}:LRA=${LOUDNESS_RANGE}:print_format=json`
  );
  return parts.join(',');
}

/** Build second-pass filter: apply measured values, linear normalization. */
function buildSecondPassFilter(m: LoudnormMeasure): string {
  const parts: string[] = [];
  if (HIGHPASS_HZ > 0) {
    parts.push(`highpass=f=${HIGHPASS_HZ}`);
  }
  parts.push(
    `loudnorm=I=${TARGET_LUFS}:TP=${PEAK_LIMIT_DB}:LRA=${LOUDNESS_RANGE}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  );
  return parts.join(',');
}

/**
 * Process video audio: two-pass loudness normalize, limit, re-mux.
 * Downloads from videoUrl, runs FFmpeg (measure → apply), uploads to storage.
 */
export async function processUploadAudio(
  videoId: string,
  videoUrl: string,
  creatorId: string
): Promise<AudioProcessingPipelineResult> {
  try {
    assertFfmpegAvailable();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }

  const tempDir = tmpdir();
  const inputPath = join(tempDir, `betalent-audio-in-${videoId}-${Date.now()}.tmp`);
  const outputPath = join(tempDir, `betalent-audio-out-${videoId}-${Date.now()}.mp4`);

  const cleanup = () => {
    try {
      if (existsSync(inputPath)) unlinkSync(inputPath);
      if (existsSync(outputPath)) unlinkSync(outputPath);
    } catch {
      /* ignore */
    }
  };

  try {
    // 1. Download video to temp file
    const fetchRes = await fetch(videoUrl, {
      headers: { 'User-Agent': 'BETALENT-AudioProcessor/1.0' },
      signal: AbortSignal.timeout(Math.min(PROCESSING_TIMEOUT_MS, 120000)),
    });
    if (!fetchRes.ok) {
      return { ok: false, error: `Failed to fetch video: ${fetchRes.status}` };
    }
    const arrayBuffer = await fetchRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(inputPath, buffer);

    // 2. First pass: measure loudness (no output)
    const firstPassArgs = [
      '-y',
      '-i',
      inputPath,
      '-af',
      buildFirstPassFilter(),
      '-f',
      'null',
      '-',
    ];
    const firstResult = await runFfmpegWithTimeout(firstPassArgs);
    const measure = parseLoudnormJson(firstResult.stderr);

    if (!measure) {
      // Fallback: single-pass if JSON parse fails (e.g. very short/silent file)
      const fallbackFilter = [
        ...(HIGHPASS_HZ > 0 ? [`highpass=f=${HIGHPASS_HZ}`] : []),
        `loudnorm=I=${TARGET_LUFS}:TP=${PEAK_LIMIT_DB}:LRA=${LOUDNESS_RANGE}`,
      ].join(',');
      const fallbackArgs = [
        '-y',
        '-i',
        inputPath,
        '-af',
        fallbackFilter,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        AAC_BITRATE,
        '-ar',
        String(OUTPUT_SAMPLE_RATE),
        '-movflags',
        '+faststart',
        outputPath,
      ];
      const fallbackResult = await runFfmpegWithTimeout(fallbackArgs);
      if (fallbackResult.code !== 0) {
        const msg = fallbackResult.stderr.slice(-500) || `ffmpeg exited ${fallbackResult.code}`;
        return { ok: false, error: msg };
      }
    } else {
      // 3. Second pass: apply measured values, produce output
      const secondPassArgs = [
        '-y',
        '-i',
        inputPath,
        '-af',
        buildSecondPassFilter(measure),
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        AAC_BITRATE,
        '-ar',
        String(OUTPUT_SAMPLE_RATE),
        '-movflags',
        '+faststart',
        outputPath,
      ];
      const secondResult = await runFfmpegWithTimeout(secondPassArgs);
      if (secondResult.code !== 0) {
        const msg = secondResult.stderr.slice(-500) || `ffmpeg exited ${secondResult.code}`;
        return { ok: false, error: msg };
      }
    }

    if (!existsSync(outputPath)) {
      return { ok: false, error: 'FFmpeg did not produce output file' };
    }

    // 4. Upload processed video to storage (overwrites original)
    const outputBuffer = readFileSync(outputPath);
    const { url } = await uploadProcessedVideo(creatorId, videoId, outputBuffer);

    cleanup();
    return { ok: true, videoUrl: url };
  } catch (e) {
    cleanup();
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/**
 * Run audio processing pipeline step for a video.
 * Pipeline: GENERATING_THUMBNAIL → PROCESSING_AUDIO → ANALYZING_AUDIO.
 */
export async function runAudioProcessingPipelineStep(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      videoUrl: true,
      creatorId: true,
      processingStatus: true,
      storageKey: true,
    },
  });
  if (!video?.videoUrl) return;
  if (video.processingStatus !== 'PROCESSING_AUDIO') return;

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

  const originalStorageKey =
    video.storageKey ??
    extractStorageKeyFromUrl(video.videoUrl);
  const processedStorageKey = buildVideoStorageKey(video.creatorId, video.id, 'mp4');

  const result = await processUploadAudio(videoId, video.videoUrl, video.creatorId);

  if (result.ok) {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        videoUrl: result.videoUrl,
        storageKey: processedStorageKey,
        processingStatus: 'ANALYZING_AUDIO',
        processingError: null,
        updatedAt: new Date(),
      },
    });
    if (originalStorageKey && originalStorageKey !== processedStorageKey) {
      const deleted = await deleteStorageObject(originalStorageKey);
      if (!deleted.ok) {
        console.error('[audio-processing] failed to delete replaced original object', {
          videoId,
          originalStorageKey,
          processedStorageKey,
          error: deleted.error,
        });
      } else {
        console.info('[audio-processing] deleted replaced original object', {
          videoId,
          originalStorageKey,
        });
      }
    }
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
