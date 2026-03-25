'use client';

/** BETALENT-style loading spinner. Dark theme, accent red. */
export default function Loader() {
  return (
    <div
      className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-white/10 border-t-accent"
      role="status"
      aria-label="Loading"
    />
  );
}
