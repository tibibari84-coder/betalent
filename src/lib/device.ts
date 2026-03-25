export function isMobileOrTabletDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const platform = (navigator as any).platform || '';
  const maxTouchPoints = (navigator as any).maxTouchPoints ?? 0;

  // iOS / iPadOS detection, including iPadOS 13+ which reports MacIntel
  const isIPad =
    /\b(iPad)\b/i.test(ua) ||
    /\b(iPad)\b/i.test(platform) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);
  const isIPhone = /\biPhone\b/i.test(ua) || /\biPhone\b/i.test(platform);

  // Android phones & tablets
  const isAndroid = /Android/i.test(ua);
  const isAndroidMobile = isAndroid && /Mobile/i.test(ua);
  const isAndroidTablet = isAndroid && !/Mobile/i.test(ua);

  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer:coarse)').matches;

  const isTouchPrimary = maxTouchPoints > 1 || hasCoarsePointer;

  const isMobileOrTabletUA = isIPad || isIPhone || isAndroidMobile || isAndroidTablet;

  // Hard desktop patterns – even with touch, treat as desktop
  const isKnownDesktopUA = /(Macintosh|Windows NT|X11|Linux x86_64)/.test(ua);

  if (isMobileOrTabletUA) return true;
  if (isKnownDesktopUA) return false;

  // Fallback: touch-first device that doesn't clearly identify as desktop
  return isTouchPrimary;
}

