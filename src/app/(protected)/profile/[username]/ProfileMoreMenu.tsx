'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconX,
  IconChevronRight,
  IconSettings,
  IconShare,
  IconGift,
  IconQuestionMarkCircle,
  IconArrowPath,
} from '@/components/ui/Icons';

interface ProfileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onShareProfile?: () => void;
}

const sheetStyle = {
  background: 'rgba(10,10,12,0.97)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 -20px 60px rgba(0,0,0,0.55)',
};

function MenuRow({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  const content = (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <Icon className="h-5 w-5 shrink-0 text-white/45" />
      <span className="truncate font-medium text-[15px] text-white/90">{label}</span>
      <IconChevronRight className="ml-auto h-5 w-5 shrink-0 text-white/25" />
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="-mx-1 flex min-h-[50px] items-center rounded-xl px-3 transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="-mx-1 flex w-full min-h-[50px] items-center rounded-xl px-3 text-left transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]"
      onClick={onClick}
    >
      {content}
    </button>
  );
}

export default function ProfileMoreMenu({ isOpen, onClose, isOwner, onShareProfile }: ProfileMoreMenuProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-more-title"
        className="fixed bottom-0 left-1/2 z-[61] max-h-[78vh] w-full max-w-[480px] -translate-x-1/2 overflow-y-auto rounded-t-[22px] transition-transform duration-300 ease-out"
        style={sheetStyle}
      >
        <div className="sticky top-0 z-10 flex justify-center bg-inherit pb-2 pt-3">
          <div className="h-1 w-9 rounded-full bg-white/20" aria-hidden />
        </div>

        <header className="flex items-center justify-between px-5 pb-3">
          <h2 id="profile-more-title" className="font-display text-[17px] font-semibold text-white">
            Menu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <IconX className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-1 px-3 pb-6">
          <nav
            className="rounded-[14px] px-1 py-1"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            aria-label="Profile actions"
          >
            <MenuRow
              icon={IconShare}
              label="Share profile"
              onClick={() => {
                onClose();
                onShareProfile?.();
              }}
            />
            {isOwner ? <MenuRow href="/wallet" icon={IconGift} label="Wallet" onClick={onClose} /> : null}
            {isOwner ? <MenuRow href="/settings" icon={IconSettings} label="Settings" onClick={onClose} /> : null}
          </nav>

          <nav
            className="rounded-[14px] px-1 py-1"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            aria-label="Support"
          >
            <MenuRow href="/contact" icon={IconQuestionMarkCircle} label="Help" onClick={onClose} />
          </nav>

          {isOwner ? (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full min-h-[50px] items-center justify-center gap-2 rounded-[14px] border border-red-500/25 px-4 font-semibold text-[15px] text-red-400/95 transition-colors hover:bg-red-500/10"
            >
              <IconArrowPath className="h-5 w-5" />
              Log out
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}
