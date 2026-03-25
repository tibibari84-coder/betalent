'use client';

import { usePerformanceModal } from '@/contexts/PerformanceModalContext';

interface OpenPerformanceModalTriggerProps {
  videoId: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Optional: render as a different element (default: div) */
  as?: 'div' | 'span' | 'button';
}

/**
 * Client-only trigger that opens the Performance Modal with the given video.
 * Use on server-rendered pages (home, explore) where performance links should open the modal instead of navigating.
 * Does not change layout; pass through className and children for identical appearance.
 */
export default function OpenPerformanceModalTrigger({
  videoId,
  children,
  className = '',
  style,
  as: Component = 'div',
}: OpenPerformanceModalTriggerProps) {
  const { openModal } = usePerformanceModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openModal(videoId);
  };

  return (
    <Component
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(videoId);
        }
      }}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}
