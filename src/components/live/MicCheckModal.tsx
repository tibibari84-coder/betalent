'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconX, IconMic2 } from '@/components/ui/Icons';
import {
  AUDIO_PRESETS,
  PRESET_CONFIG,
  getAudioConstraintsForPreset,
  MIC_LEVEL_THRESHOLDS,
  type MicCheckStatus,
  type AudioPresetId,
} from '@/constants/live-audio';

export interface MicCheckResult {
  status: MicCheckStatus;
  level: number;
  suggestedPreset: AudioPresetId;
  recommendHeadphones: boolean;
}

interface MicCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReady: (result: MicCheckResult) => void;
  /** Initial preset for capture. */
  initialPreset?: AudioPresetId;
}

function getStatusMessage(status: MicCheckStatus): string {
  switch (status) {
    case 'checking':
      return 'Checking your microphone…';
    case 'no_signal':
      return 'No signal. Sing a line at performance volume to test.';
    case 'too_low':
      return 'Too quiet. Move closer, sing louder, or increase mic level.';
    case 'good':
      return 'Level good. Your voice is clear — ready for your slot.';
    case 'too_high':
      return 'Too loud. Lower input so belted notes don’t clip.';
    case 'clipping':
      return 'Clipping detected. Lower mic level before you perform.';
    case 'error':
      return 'Could not access microphone. Check permissions.';
    default:
      return '';
  }
}

function getStatusColor(status: MicCheckStatus): string {
  switch (status) {
    case 'good':
      return 'text-emerald-400';
    case 'too_low':
    case 'too_high':
      return 'text-amber-400';
    case 'clipping':
    case 'error':
    case 'no_signal':
      return 'text-red-400';
    default:
      return 'text-white/70';
  }
}

export default function MicCheckModal({
  isOpen,
  onClose,
  onReady,
  initialPreset = AUDIO_PRESETS.STANDARD,
}: MicCheckModalProps) {
  const [status, setStatus] = useState<MicCheckStatus>('checking');
  const [level, setLevel] = useState(0);
  const [preset, setPreset] = useState<AudioPresetId>(initialPreset);
  const [recommendHeadphones, setRecommendHeadphones] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (animationRef.current != null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    setStatus('checking');
    setLevel(0);

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...getAudioConstraintsForPreset(preset),
        },
      })
      .then((stream) => {
        streamRef.current = stream;
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        source.connect(analyser);
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!analyserRef.current) return;
          analyser.getByteFrequencyData(data);
          const rms = Math.sqrt(
            data.reduce((s, x) => s + x * x, 0) / data.length
          );
          setLevel(rms);

          if (rms < 2) {
            setStatus('no_signal');
          } else if (rms < MIC_LEVEL_THRESHOLDS.MIN_GOOD) {
            setStatus('too_low');
          } else if (rms > MIC_LEVEL_THRESHOLDS.CLIPPING_RISK) {
            setStatus('clipping');
          } else if (rms > MIC_LEVEL_THRESHOLDS.MAX_GOOD) {
            setStatus('too_high');
          } else {
            setStatus('good');
          }

          animationRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        setStatus('error');
      });

    return stopStream;
  }, [isOpen, preset, stopStream]);

  const handleContinue = () => {
    stopStream();
    onReady({
      status,
      level,
      suggestedPreset: preset,
      recommendHeadphones: recommendHeadphones || status === 'no_signal',
    });
    onClose();
  };

  const handleCancel = () => {
    stopStream();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mic-check-title"
        className="fixed z-50 w-full max-w-[440px] p-6
          left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
          rounded-[24px] max-h-[90vh] overflow-y-auto
          border border-[rgba(255,255,255,0.08)]"
        style={{
          background: 'rgba(26,26,28,0.98)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow:
            '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(177,18,38,0.18)' }}
            >
              <IconMic2 className="w-6 h-6 text-accent" />
            </span>
            <div>
              <h2
                id="mic-check-title"
                className="font-display text-[20px] font-semibold text-text-primary"
              >
                Mic check
              </h2>
              <p className="text-[13px] text-text-secondary mt-0.5">
                Sing a line at performance volume – we’ll check your levels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </header>

        {/* Level meter */}
        <div className="mb-6">
          <div
            className="h-3 rounded-full overflow-hidden bg-white/10"
            role="progressbar"
            aria-valuenow={level}
            aria-valuemin={0}
            aria-valuemax={255}
          >
            <div
              className="h-full transition-all duration-150 ease-out rounded-full"
              style={{
                width: `${Math.min(100, (level / 255) * 100)}%`,
                background:
                  status === 'good'
                    ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                    : status === 'clipping' || status === 'too_high'
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(90deg, #b11226, #e11d48)',
              }}
            />
          </div>
          <p
            className={`mt-3 text-[14px] font-medium ${getStatusColor(status)}`}
          >
            {getStatusMessage(status)}
          </p>
        </div>

        {/* Preset selector */}
        <div className="mb-6">
          <p className="text-[12px] uppercase tracking-wider text-white/50 font-medium mb-3">
            Audio preset
          </p>
          <div className="flex flex-col gap-2">
            {(Object.keys(PRESET_CONFIG) as AudioPresetId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setPreset(id)}
                className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                  preset === id
                    ? 'border-accent bg-accent/10 text-white'
                    : 'border-white/10 hover:border-white/20 text-white/80'
                }`}
              >
                <span className="font-medium">{PRESET_CONFIG[id].label}</span>
                <span className="block text-[12px] text-white/50 mt-0.5">
                  {PRESET_CONFIG[id].description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Headphones hint */}
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[13px] text-white/80">
            <strong>Tip:</strong> Use headphones during live to prevent echo and
            feedback. Your voice will sound cleaner to the audience.
          </p>
          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={recommendHeadphones}
              onChange={(e) => setRecommendHeadphones(e.target.checked)}
              className="rounded border-white/30"
            />
            <span className="text-[13px] text-white/70">
              Remind me to use headphones
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 py-3 px-4 rounded-xl font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
