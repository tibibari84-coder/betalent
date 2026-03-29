'use client';

/**
 * Compact profile route error — does not replace the whole app shell with a scary full-page failure.
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[45vh] w-full flex-col items-center justify-center bg-[#050505] px-6 py-12">
      <p className="max-w-[280px] text-center font-sans text-[14px] leading-relaxed text-white/65">
        This profile could not be loaded.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message ? (
        <p className="mt-3 max-w-sm text-center font-mono text-[11px] text-white/35">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-full border border-white/[0.12] bg-white/[0.06] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.1]"
      >
        Try again
      </button>
    </div>
  );
}
