'use client';

/**
 * Renders live challenge windows in the user's local time.
 * No hardcoded timezone strings; uses browser's Intl for timezone-aware display.
 */

export type LiveWindow = {
  id: string;
  regionLabel: string;
  timezone: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  status: string;   // SCHEDULED | LIVE | COMPLETED | CANCELLED
};

type WindowDisplayStatus = 'upcoming' | 'live_now' | 'ended';

function getWindowDisplayStatus(w: LiveWindow, now: number): WindowDisplayStatus {
  const start = new Date(w.startsAt).getTime();
  const end = new Date(w.endsAt).getTime();
  if (now < start) return 'upcoming';
  if (now <= end) return 'live_now';
  return 'ended';
}

/** Format UTC ISO string to user's local time (date + time, short). */
function formatLocalDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Format UTC ISO string to user's local time (time only). */
function formatLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Optional: show time in event's timezone for clarity. */
function formatInEventTimezone(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone: tz,
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return formatLocalDateTime(iso);
  }
}

const STATUS_STYLES: Record<WindowDisplayStatus, { label: string; className: string }> = {
  upcoming: { label: 'Upcoming', className: 'text-[#9ca3af]' },
  live_now: { label: 'Live now', className: 'text-accent font-semibold' },
  ended: { label: 'Ended', className: 'text-white/50' },
};

export function LiveWindowDisplay({
  windows,
  showEventTimezone = true,
  variant = 'full',
}: {
  windows: LiveWindow[];
  showEventTimezone?: boolean;
  variant?: 'full' | 'compact' | 'inline';
}) {
  const now = Date.now();

  if (!windows || windows.length === 0) return null;

  if (variant === 'inline') {
    const first = windows[0];
    const status = getWindowDisplayStatus(first, now);
    const { label } = STATUS_STYLES[status];
    return (
      <span className="text-[13px] text-white/70">
        {label} · {formatLocalDateTime(first.startsAt)}
        {windows.length > 1 && ` (+${windows.length - 1} more)`}
      </span>
    );
  }

  if (variant === 'compact') {
    const live = windows.find((w) => getWindowDisplayStatus(w, now) === 'live_now');
    const next = windows.find((w) => getWindowDisplayStatus(w, now) === 'upcoming');
    const display = live ?? next ?? windows[0];
    const status = getWindowDisplayStatus(display, now);
    const { label, className } = STATUS_STYLES[status];
    return (
      <p className="text-[13px] text-white/60">
        <span className={className}>{label}</span>
        {status !== 'ended' && (
          <>
            {' · '}
            {display.regionLabel}: {formatLocalTime(display.startsAt)} – {formatLocalTime(display.endsAt)} (your time)
          </>
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium">
        Live windows · Your local time
      </p>
      {windows.map((w) => {
        const status = getWindowDisplayStatus(w, now);
        const { label, className } = STATUS_STYLES[status];
        return (
          <div
            key={w.id}
            className="rounded-[12px] border border-white/[0.06] p-3.5"
            style={{ background: 'rgba(20,20,22,0.6)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-white">{w.regionLabel}</span>
              <span className={className}>{label}</span>
            </div>
            <p className="text-[14px] text-white/90">
              {formatLocalDateTime(w.startsAt)} – {formatLocalTime(w.endsAt)}
            </p>
            {showEventTimezone && w.timezone !== 'UTC' && (
              <p className="text-[12px] text-white/50 mt-1">
                Event timezone: {w.timezone} ({formatInEventTimezone(w.startsAt, w.timezone)})
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
