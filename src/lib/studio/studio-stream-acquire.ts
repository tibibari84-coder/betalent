import {
  STUDIO_AUDIO_CONSTRAINTS,
  buildStudioVideoConstraintsMinimal,
  buildStudioVideoConstraintsPrimary,
  buildStudioVideoConstraintsRelaxed,
} from '@/lib/studio/studio-camera-constraints';

export type StudioFacing = 'user' | 'environment';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

/** Portrait hint without width/height caps (avoids locking a fixed capture size). */
function constraintsIdealPortrait(facing: StudioFacing): MediaTrackConstraints {
  return {
    facingMode: facing,
    aspectRatio: { ideal: 9 / 16 },
    frameRate: { ideal: 30, max: 60 },
  };
}

function buildConstraintTiers(facing: StudioFacing): MediaStreamConstraints[] {
  const mobile = isMobileViewport();
  if (mobile) {
    return [
      { video: buildStudioVideoConstraintsPrimary({ facing, isMobile: true }), audio: true },
      { video: buildStudioVideoConstraintsRelaxed({ facing, isMobile: true }), audio: true },
      { video: constraintsIdealPortrait(facing), audio: true },
      { video: { facingMode: facing }, audio: true },
      { video: buildStudioVideoConstraintsMinimal(facing), audio: true },
      { video: true, audio: true },
    ];
  }
  return [
    { video: buildStudioVideoConstraintsPrimary({ facing, isMobile: false }), audio: true },
    { video: buildStudioVideoConstraintsRelaxed({ facing, isMobile: false }), audio: true },
    { video: constraintsIdealPortrait(facing), audio: true },
    { video: { facingMode: facing }, audio: true },
    { video: true, audio: true },
  ];
}

/**
 * Portrait-first getUserMedia with resolution fallbacks. Preview uses full-bleed `object-cover`
 * so framing matches the device screen; capture size is not forced up front on mobile.
 */
export async function acquireStudioMedia(facing: StudioFacing): Promise<MediaStream> {
  const tiers = buildConstraintTiers(facing);

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

  const mobile = isMobileViewport();
  const videoPortraitTiers: MediaTrackConstraints[] = mobile
    ? [
        buildStudioVideoConstraintsPrimary({ facing, isMobile: true }),
        buildStudioVideoConstraintsRelaxed({ facing, isMobile: true }),
        constraintsIdealPortrait(facing),
        { facingMode: facing },
        buildStudioVideoConstraintsMinimal(facing),
      ]
    : [
        buildStudioVideoConstraintsPrimary({ facing, isMobile: false }),
        buildStudioVideoConstraintsRelaxed({ facing, isMobile: false }),
        constraintsIdealPortrait(facing),
        { facingMode: facing },
      ];

  for (const video of videoPortraitTiers) {
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video });
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: STUDIO_AUDIO_CONSTRAINTS,
      });
      return new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
    } catch (e) {
      lastErr = e;
      const name = (e as DOMException)?.name;
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') continue;
      throw e;
    }
  }

  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: STUDIO_AUDIO_CONSTRAINTS,
    });
    return new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
  } catch {
    /* fall through */
  }

  throw lastErr;
}
