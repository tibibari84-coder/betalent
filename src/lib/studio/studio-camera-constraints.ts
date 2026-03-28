/**
 * getUserMedia video constraints — mobile-first vertical, with desktop + fallback tiers.
 */

export type Facing = 'user' | 'environment';

/** Primary: portrait-friendly ideals (web best-effort; browsers may approximate). */
export function buildStudioVideoConstraintsPrimary(params: {
  facing: Facing;
  isMobile: boolean;
}): MediaTrackConstraints {
  const { facing, isMobile } = params;
  if (isMobile) {
    /** No fixed resolution — let the device/driver choose; preview size follows the container. */
    return {
      facingMode: facing,
      frameRate: { ideal: 30, max: 60 },
    };
  }
  // Desktop webcams are usually landscape; avoid impossible ideal>max pairs.
  return {
    facingMode: facing,
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 },
  };
}

/** Secondary: optional portrait hint without forcing a resolution. */
export function buildStudioVideoConstraintsRelaxed(params: { facing: Facing; isMobile: boolean }): MediaTrackConstraints {
  const { facing, isMobile } = params;
  if (isMobile) {
    return {
      facingMode: facing,
      aspectRatio: { ideal: 9 / 16 },
      frameRate: { ideal: 30, max: 60 },
    };
  }
  return {
    facingMode: facing,
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1440 },
    frameRate: { ideal: 30, max: 60 },
  };
}

/** Last resort: facing + frame rate only. */
export function buildStudioVideoConstraintsMinimal(facing: Facing): MediaTrackConstraints {
  return {
    facingMode: facing,
    frameRate: { ideal: 30, max: 60 },
  };
}

export const STUDIO_AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export async function acquireVideoStreamWithFallback(
  facing: Facing,
  isMobile: boolean
): Promise<MediaStream> {
  const objectTiers: MediaTrackConstraints[] = [
    buildStudioVideoConstraintsPrimary({ facing, isMobile }),
    buildStudioVideoConstraintsRelaxed({ facing, isMobile }),
    buildStudioVideoConstraintsMinimal(facing),
  ];

  let lastErr: unknown;
  for (const video of objectTiers) {
    try {
      return await navigator.mediaDevices.getUserMedia({ video });
    } catch (e) {
      lastErr = e;
      const name = (e as DOMException)?.name;
      if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') continue;
      throw e;
    }
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (e) {
    throw lastErr ?? e;
  }
}
