'use client';

/**
 * Inline-sized route error — does not hijack the full viewport like a dashboard failure screen.
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center bg-[#050505] px-5 py-10">
      <p className="max-w-[260px] text-center text-[13px] leading-relaxed text-white/50">
        Couldn&apos;t load this profile.
      </p>
      {process.env.NODE_ENV === 'development' && error?.message ? (
        <p className="mt-2 max-w-sm text-center font-mono text-[10px] text-white/28">{error.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 rounded-full border border-white/[0.1] bg-white/[0.05] px-5 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/[0.09]"
      >
        Try again
      </button>
    </div>
  );
}
