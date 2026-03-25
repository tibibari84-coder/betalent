'use client';

/**
 * Client component for dashboard/challenge cards.
 * Renders live windows in user's local time (must be client for Intl/local TZ).
 */
import { LiveWindowDisplay } from './LiveWindowDisplay';

type WindowData = {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: Date | string;
  endsAt: Date | string;
  status: string;
};

export function FeaturedChallengeLiveWindows({ windows }: { windows: WindowData[] }) {
  if (!windows || windows.length === 0) return null;
  const normalized = windows.map((w) => ({
    ...w,
    startsAt: typeof w.startsAt === 'string' ? w.startsAt : (w.startsAt as Date).toISOString(),
    endsAt: typeof w.endsAt === 'string' ? w.endsAt : (w.endsAt as Date).toISOString(),
  }));
  return (
    <div className="mt-2">
      <LiveWindowDisplay windows={normalized} showEventTimezone={false} variant="compact" />
    </div>
  );
}
