/**
 * Preview composition for studio <video> — keeps 9:16 feel without letterboxing selfies.
 */

export type StudioPreviewFraming = {
  fit: 'cover' | 'contain';
  objectPosition: string;
  stageAspect: '9 / 16' | '3 / 4';
};

const STUDIO_STAGE_RATIO = 9 / 16;
const RATIO_EPSILON = 0.015;

export function resolvePreviewFraming(params: {
  sourceRatio: number | null;
  isMobile: boolean;
  camera: 'user' | 'environment';
}): StudioPreviewFraming {
  const { sourceRatio, isMobile, camera } = params;
  if (!sourceRatio || !Number.isFinite(sourceRatio)) {
    return {
      fit: 'cover',
      objectPosition: camera === 'user' ? '50% 33%' : '50% 50%',
      stageAspect: isMobile ? '9 / 16' : '3 / 4',
    };
  }

  if (!isMobile) {
    return {
      fit: 'cover',
      objectPosition: camera === 'user' ? '50% 34%' : '50% 50%',
      stageAspect: sourceRatio > 0.72 ? '3 / 4' : '9 / 16',
    };
  }

  const ratioDelta = sourceRatio - STUDIO_STAGE_RATIO;
  const isWiderThanStage = ratioDelta > RATIO_EPSILON;
  const isTallerThanStage = ratioDelta < -RATIO_EPSILON;

  if (camera === 'user') {
    if (isWiderThanStage) return { fit: 'cover', objectPosition: '50% 34%', stageAspect: '9 / 16' };
    if (isTallerThanStage) return { fit: 'cover', objectPosition: '50% 30%', stageAspect: '9 / 16' };
    return { fit: 'cover', objectPosition: '50% 33%', stageAspect: '9 / 16' };
  }

  return { fit: 'cover', objectPosition: '50% 50%', stageAspect: '9 / 16' };
}

/** Mobile immersive: single full-bleed stage — no mixed aspect + height hacks. */
export function resolveImmersiveMobileFraming(camera: 'user' | 'environment'): StudioPreviewFraming {
  return {
    fit: 'cover',
    objectPosition: camera === 'user' ? '50% 32%' : '50% 50%',
    stageAspect: '9 / 16',
  };
}
