import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

/**
 * Profile routes use Inter for mobile-first UI (SF Pro–like system stack on iOS via body fallback).
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.className} min-h-0 bg-[#000000] text-white`}>{children}</div>;
}
