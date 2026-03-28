import { STUDIO_AUDIO_CONSTRAINTS } from '@/lib/studio/studio-camera-constraints';

export type StudioFacing = 'user' | 'environment';

/**
 * TikTok-style portrait-first constraints. Browsers may approximate; fallbacks handle Overconstrained.
 */
function constraintsIdealPortrait(facing: StudioFacing): MediaTrackConstraints {
  return {
    facingMode: facing,
    width: { ideal: 720 },
    height: { ideal: 1280 },
    aspectRatio: { ideal: 9 / 16 },
    frameRate: { ideal: 30, max: 30 },
  };
}

/**
 * 1) 720×1280 ideal + 9:16 + single getUserMedia(video+audio)
 * 2) facingMode + audio only (minimal video)
 * 3) plain video + audio
 * 4) split video/audio (Chrome site-settings / driver quirks)
 */
export async function acquireStudioMedia(facing: StudioFacing): Promise<MediaStream> {
  const tiers: MediaStreamConstraints[] = [
    { video: constraintsIdealPortrait(facing), audio: true },
    { video: { facingMode: facing }, audio: true },
    { video: true, audio: true },
  ];

  let lastErr: unknown;
  for (const constraints of tiers) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
      const name = (e as DOMException)?.name;
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') continue;
      throw e;
    }
  }

  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: constraintsIdealPortrait(facing),
    });
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: STUDIO_AUDIO_CONSTRAINTS,
    });
    return new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
  } catch {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: STUDIO_AUDIO_CONSTRAINTS,
      });
      return new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
    } catch {
      /* fall through */
    }
  }

  throw lastErr;
}
