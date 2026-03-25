/**
 * BETALENT premium upload audio processing – singer-first, studio-like consistency.
 * Optimized for vocal clarity and expression, NOT speech-call quality.
 * Do not over-process; preserve vocal character.
 *
 * Env overrides: AUDIO_PROCESSING_TARGET_LUFS, AUDIO_PROCESSING_PEAK_LIMIT_DB,
 * AUDIO_PROCESSING_AAC_BITRATE, AUDIO_PROCESSING_LOUDNESS_RANGE, AUDIO_PROCESSING_TIMEOUT_MS.
 */

/** Target integrated loudness (LUFS). EBU R128 / streaming standard. */
export const TARGET_LUFS = parseFloat(process.env.AUDIO_PROCESSING_TARGET_LUFS ?? '-14');

/** True peak limit (dBTP). Prevents clipping while preserving vocal peaks. */
export const PEAK_LIMIT_DB = parseFloat(process.env.AUDIO_PROCESSING_PEAK_LIMIT_DB ?? '-1');

/**
 * Loudness range (LU). Singer-first: 12 preserves more dynamic expression than speech (11).
 * Allows soft passages and belted peaks to coexist without over-compression.
 */
export const LOUDNESS_RANGE = Math.max(10, Math.min(14, parseInt(process.env.AUDIO_PROCESSING_LOUDNESS_RANGE ?? '12', 10)));

/** AAC bitrate. 128k = good for vocals + backing; 160k for richer harmonics (optional env override). */
export const AAC_BITRATE = process.env.AUDIO_PROCESSING_AAC_BITRATE ?? '128k';

/** Output sample rate. 48kHz = common for video. */
export const OUTPUT_SAMPLE_RATE = 48000;

/**
 * Highpass cutoff (Hz). Reduces rumble and phone handling noise.
 * 75Hz preserves male vocal fundamentals (~85Hz); keeps low-mid vocal body.
 */
export const HIGHPASS_HZ = 75;

/** Enable light denoise (FFmpeg afftdn). Can affect vocal if aggressive. Default off for Phase 1. */
export const ENABLE_DENOISE = process.env.AUDIO_PROCESSING_ENABLE_DENOISE === 'true';

/** FFmpeg process timeout (ms). 2–3× realtime for 1-min video. */
export const PROCESSING_TIMEOUT_MS = Math.max(
  60000,
  parseInt(process.env.AUDIO_PROCESSING_TIMEOUT_MS ?? '180000', 10)
);

/** Processing version for metadata (future). */
export const PROCESSING_VERSION = process.env.AUDIO_PROCESSING_VERSION ?? '1.0';
