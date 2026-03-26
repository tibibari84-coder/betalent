'use client';

/** Broadcast-style corners; wraps the 9:16 frame so brackets align with picture edges. */
export default function ViewfinderFrame({ children }: { children: React.ReactNode }) {
  const corner = 'absolute z-[17] pointer-events-none border-white/[0.22] w-7 h-7 sm:w-8 sm:h-8';
  return (
    <div className="relative mx-auto w-full max-w-[380px] sm:max-w-[420px]">
      <div className={`${corner} left-2 top-2 sm:left-3 sm:top-3 border-l-2 border-t-2 rounded-tl-[10px]`} aria-hidden />
      <div className={`${corner} right-2 top-2 sm:right-3 sm:top-3 border-r-2 border-t-2 rounded-tr-[10px]`} aria-hidden />
      <div className={`${corner} left-2 bottom-2 sm:left-3 sm:bottom-3 border-l-2 border-b-2 rounded-bl-[10px]`} aria-hidden />
      <div className={`${corner} right-2 bottom-2 sm:right-3 sm:bottom-3 border-r-2 border-b-2 rounded-br-[10px]`} aria-hidden />
      {children}
    </div>
  );
}
