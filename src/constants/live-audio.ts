/**
 * BETALENT live audio – creator presets, capture constraints, level thresholds.
 * Singer-first: optimized for vocal clarity and expression, NOT speech-call quality.
 * Balance: vocal clarity, low noise, low clipping, consistent loudness, low latency, creator confidence.
 */

/** Creator audio preset IDs. */
export const AUDIO_PRESETS = {
  STANDARD: 'standard',
  SINGING: 'singing',
  STUDIO_CLEAN: 'studio_clean',
} as const;

export type AudioPresetId = (typeof AUDIO_PRESETS)[keyof typeof AUDIO_PRESETS];

/**
 * Preset metadata for UI and getUserMedia constraints.
 * Singing preset: AGC OFF to preserve dynamics (soft vs belted); NS on for room noise.
 * Standard: full processing for phone/laptop in noisy environments.
 * Studio Clean: minimal processing for external mics in quiet rooms.
 */
export const PRESET_CONFIG: Record<
  AudioPresetId,
  {
    label: string;
    description: string;
    useCase: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;
    /** Optional: sampleRate for advanced config. */
    sampleRate?: number;
    /** When to recommend. */
    recommendWhen: string;
  }
> = {
  [AUDIO_PRESETS.STANDARD]: {
    label: 'Standard',
    description: 'Balanced for phone/laptop. Echo cancellation, noise suppression, automatic gain.',
    useCase: 'General use, phone or laptop mic',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    recommendWhen: 'Default when using phone or laptop built-in mic.',
  },
  [AUDIO_PRESETS.SINGING]: {
    label: 'Singing / Vocal',
    description: 'Preserves vocal dynamics (soft to belted). No AGC – your expression stays intact. Best in quiet room.',
    useCase: 'Singers, performers – vocal expression prioritized',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    recommendWhen: 'When singing or performing vocals. Use headphones.',
  },
  [AUDIO_PRESETS.STUDIO_CLEAN]: {
    label: 'Studio Clean',
    description: 'Minimal processing for external mics. Preserves full vocal character. Quiet room required.',
    useCase: 'External mic, treated room',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: false,
    recommendWhen: 'When using an external microphone in a quiet space.',
  },
};

/** getUserMedia constraints for a preset. */
export function getAudioConstraintsForPreset(presetId: AudioPresetId): MediaTrackConstraints {
  const config = PRESET_CONFIG[presetId];
  return {
    echoCancellation: config.echoCancellation,
    noiseSuppression: config.noiseSuppression,
    autoGainControl: config.autoGainControl,
    ...(config.sampleRate && { sampleRate: config.sampleRate }),
  };
}

/**
 * Mic check level thresholds (0–255 from AnalyserNode byte data).
 * Singer-first: MIN_GOOD allows soft passages; MAX/CLIPPING catch belted peaks.
 */
export const MIC_LEVEL_THRESHOLDS = {
  /** Below = too quiet (singers: sing at performance volume). */
  MIN_GOOD: 12,
  /** Above = too loud, risk clipping on peaks. */
  MAX_GOOD: 225,
  /** Above = definite clipping risk. */
  CLIPPING_RISK: 240,
} as const;

/** Mic check status. */
export type MicCheckStatus = 'checking' | 'no_signal' | 'too_low' | 'good' | 'too_high' | 'clipping' | 'error';
