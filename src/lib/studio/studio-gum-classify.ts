'use client';

import type { StudioCameraPermissionState, StudioRecorderErrorCode } from '@/lib/studio/studio-recorder-types';
import {
  cameraEnvironmentBlockedMessage,
  isLikelyEmbeddedInIframe,
  isPermissionsPolicyMediaError,
} from '@/lib/studio/studio-camera-environment';

export type StudioPreviewFailure = {
  ok: false;
  message: string;
  code: StudioRecorderErrorCode;
};

type MediaPermissionGate = 'video' | 'audio';

async function queryCameraPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

async function queryMicrophonePermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    if (r.state === 'granted' || r.state === 'denied' || r.state === 'prompt') return r.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Map DOMException from a single getUserMedia (video-only or audio-only) into UI + permission state. */
export async function classifyGetUserMediaFailure(
  e: unknown,
  gate: MediaPermissionGate
): Promise<{
  result: StudioPreviewFailure;
  permissionState: StudioCameraPermissionState;
  logEvent: 'camera_environment_blocked' | 'camera_permission_denied' | 'microphone_permission_denied' | null;
  logFields?: Record<string, unknown>;
}> {
  const err = e as DOMException & { message?: string };
  const name = err?.name ?? '';
  const msgLower = (err?.message ?? '').toLowerCase();

  if (isPermissionsPolicyMediaError(e)) {
    const embedded = isLikelyEmbeddedInIframe();
    return {
      result: {
        ok: false,
        code: 'unknown',
        message: cameraEnvironmentBlockedMessage(embedded),
      },
      permissionState: 'error',
      logEvent: 'camera_environment_blocked',
      logFields: {
        gate,
        embeddedInIframe: embedded,
        errorName: name,
        errorMessagePreview: (err?.message ?? '').slice(0, 240),
        block: 'permissions_policy_document',
      },
    };
  }

  const cameraBlockedMsg =
    'Camera is blocked or not allowed for this site. In Chrome, click the lock or camera icon in the address bar → Site settings → set Camera to Allow. Camera and Microphone are listed separately — the mic can be on while the camera is still blocked.';
  const micBlockedMsg =
    'Microphone is blocked or not allowed for this site. In Chrome, open Site settings (lock icon) and set Microphone to Allow — it is separate from Camera — then tap Try again.';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    if (gate === 'audio') {
      const perm = await queryMicrophonePermissionState();
      if (perm === 'granted') {
        return {
          result: {
            ok: false,
            code: 'unknown',
            message:
              'Microphone could not start even though permission is on. Try “Reset camera”, close other apps using the mic, or reload the page.',
          },
          permissionState: 'error',
          logEvent: 'microphone_permission_denied',
          logFields: { reason: name, note: 'api_says_granted' },
        };
      }
      if (perm === 'denied') {
        return {
          result: { ok: false, code: 'microphone_permission_denied', message: micBlockedMsg },
          permissionState: 'denied',
          logEvent: 'microphone_permission_denied',
          logFields: { reason: name, permissionQuery: perm },
        };
      }
      return {
        result: {
          ok: false,
          code: 'unknown',
          message:
            'Could not start the microphone. Tap Try again, or reload the page. If access is already allowed for this site, another app may be using the mic.',
        },
        permissionState: 'error',
        logEvent: 'microphone_permission_denied',
        logFields: { reason: name, permissionQuery: perm, note: 'not_explicit_denied' },
      };
    }
    const perm = await queryCameraPermissionState();
    if (perm === 'granted') {
      return {
        result: {
          ok: false,
          code: 'unknown',
          message:
            'Camera could not start even though permission is on. Try “Reset camera”, close other apps using the camera, or reload the page.',
        },
        permissionState: 'error',
        logEvent: 'camera_permission_denied',
        logFields: { reason: name, note: 'api_says_granted' },
      };
    }
    if (perm === 'denied') {
      return {
        result: { ok: false, code: 'permission_denied', message: cameraBlockedMsg },
        permissionState: 'denied',
        logEvent: 'camera_permission_denied',
        logFields: { reason: name, permissionQuery: perm },
      };
    }
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          'Could not start the camera. Tap Try again once. If Chrome already shows Camera Allow for this site, the request may still fail while another app uses the camera, or before a reload — try closing other tabs that use the camera, then reload this page.',
      },
      permissionState: 'error',
      logEvent: 'camera_permission_denied',
      logFields: { reason: name, permissionQuery: perm, note: 'not_explicit_denied' },
    };
  }

  if (name === 'SecurityError' || msgLower.includes('secure context')) {
    return {
      result: {
        ok: false,
        code: gate === 'audio' ? 'microphone_permission_denied' : 'permission_denied',
        message:
          'Camera and microphone require a secure connection (HTTPS). Open the site over HTTPS and try again.',
      },
      permissionState: 'denied',
      logEvent: gate === 'audio' ? 'microphone_permission_denied' : 'camera_permission_denied',
      logFields: { reason: 'security' },
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          gate === 'video'
            ? 'Camera is busy or unavailable. Close other apps using the camera, then try again.'
            : 'Microphone is busy or unavailable. Close other apps using the mic, then try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      result: {
        ok: false,
        code: 'unknown',
        message:
          gate === 'video'
            ? 'These camera settings are not supported on this device. Try again.'
            : 'These microphone settings are not supported. Try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  if (name === 'NotFoundError') {
    return {
      result: {
        ok: false,
        code: gate === 'video' ? 'no_camera' : 'no_microphone',
        message:
          gate === 'video'
            ? 'No suitable camera was found. Connect a camera or try another device.'
            : 'No microphone was found. Connect a mic and try again.',
      },
      permissionState: 'error',
      logEvent: null,
    };
  }

  return {
    result: {
      ok: false,
      code: 'unknown',
      message:
        gate === 'video'
          ? 'We couldn’t open the camera. Please try again.'
          : 'We couldn’t open the microphone. Please try again.',
    },
    permissionState: 'error',
    logEvent: null,
  };
}
