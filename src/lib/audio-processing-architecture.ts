/**
 * BETALENT Premium Audio Processing Architecture – contract for upload playback pipeline.
 *
 * This module defines the interface and design for the post-upload audio processing
 * that produces consistent, studio-like playback quality across the platform.
 *
 * Implementation: services/audio-processing.service.ts
 * Constants: constants/audio-processing.ts
 *
 * Pipeline stages:
 * 1. Loudness normalization (EBU R128 -14 LUFS)
 * 2. True peak limiting (-1 dBTP)
 * 3. Optional highpass (reduce rumble)
 * 4. Optional light denoise (Phase 3)
 * 5. Re-mux: video copy + AAC 128k
 *
 * Design principles:
 * - Preserve vocal character; avoid over-processing
 * - Vocal intelligibility > loudness wars
 * - Consistent LUFS across platform
 * - Phone speaker + headphone friendly
 */

export type AudioProcessingJobInput = {
  videoId: string;
  videoUrl: string;
  creatorId: string;
};

export type AudioProcessingResult = {
  ok: true;
  /** Playback URL of processed video (overwrites original in storage). */
  videoUrl: string;
  /** Optional: input LUFS (from loudnorm first pass). */
  inputLUFS?: number;
  /** Optional: output LUFS. */
  outputLUFS?: number;
} | {
  ok: false;
  error: string;
};
