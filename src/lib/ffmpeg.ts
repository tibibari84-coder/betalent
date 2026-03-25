import { spawnSync } from 'node:child_process';

/**
 * FFmpeg runtime dependency.
 *
 * Requirement: the BETALENT media pipeline relies on `ffmpeg` being available on the
 * server runtime.
 *
 * Acceptable setups:
 * - `ffmpeg` is in PATH (default, typical VM/container installs)
 * - OR set `FFMPEG_PATH` to the full executable path (e.g. `/usr/local/bin/ffmpeg`)
 *
 * When FFmpeg is missing/unavailable we must FAIL CLEARLY and set the video processing
 * state to `PROCESSING_FAILED` (handled by the caller services).
 */

export class FfmpegNotAvailableError extends Error {
  public readonly code = 'FFMPEG_NOT_AVAILABLE';
  constructor(message: string) {
    super(message);
    this.name = 'FfmpegNotAvailableError';
  }
}

export function getFfmpegCommand(): string {
  return process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
}

export function checkFfmpegAvailable(timeoutMs = 1200): { available: boolean; error?: string } {
  const cmd = getFfmpegCommand();

  // `ffmpeg -version` is cheap and works as a runtime existence check.
  const res = spawnSync(cmd, ['-version'], {
    timeout: timeoutMs,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (res.error) {
    return { available: false, error: res.error instanceof Error ? res.error.message : String(res.error) };
  }
  if (res.status !== 0) {
    const stderr = typeof res.stderr === 'string' ? res.stderr : '';
    return { available: false, error: stderr.trim() || `ffmpeg exited with status ${res.status}` };
  }
  return { available: true };
}

export function assertFfmpegAvailable(): void {
  const check = checkFfmpegAvailable();
  if (!check.available) {
    const cmd = getFfmpegCommand();
    const extra = process.env.FFMPEG_PATH
      ? ` (FFMPEG_PATH was set to ${JSON.stringify(process.env.FFMPEG_PATH)})`
      : '';
    throw new FfmpegNotAvailableError(
      `FFmpeg is not available on the server runtime: ${check.error ?? 'unknown error'}. Command: ${cmd}.${extra}`
    );
  }
}

