'use client';

import { useEffect, useState } from 'react';
import { isMobileOrTabletDevice } from '@/lib/device';

/**
 * Bottom nav + safe-area padding: show when the device is touch-first/tablet
 * **or** the viewport is narrow (matches lg breakpoint), so desktop windows
 * resized small get the same chrome as phones.
 */
export function useCompactNavChrome(): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => {
      setShow(isMobileOrTabletDevice() || mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return show;
}
