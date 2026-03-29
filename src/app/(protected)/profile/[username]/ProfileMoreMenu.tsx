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
  IconBell,
  IconCompass,
  IconPlay,
  IconShieldCheck,
  IconQuestionMarkCircle,
  IconArrowPath,
  IconTrophy,
} from '@/components/ui/Icons';

interface ProfileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
  isOwner: boolean;
  onShareProfile?: () => void;
}

const glassStyle = {
  background: 'rgba(18,18,20,0.98)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
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
    <span className="flex items-center gap-3 flex-1 min-w-0">
      <Icon className="w-5 h-5 shrink-0 text-text-secondary" />
      <span className="font-medium text-[15px] text-text-primary">{label}</span>
      <IconChevronRight className="w-5 h-5 shrink-0 text-text-muted ml-auto" />
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex items-center min-h-[52px] px-4 rounded-[14px] hover:bg-white/5 active:bg-white/8 transition-colors -mx-1"
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="w-full flex items-center min-h-[52px] px-4 rounded-[14px] hover:bg-white/5 active:bg-white/8 transition-colors text-left -mx-1"
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-more-title"
        className="fixed z-[61] w-full max-w-[480px] left-1/2 -translate-x-1/2 bottom-0 rounded-t-[24px] max-h-[85vh] overflow-y-auto transition-transform duration-300 ease-out"
        style={glassStyle}
      >
        {/* Handle bar */}
        <div className="sticky top-0 z-10 flex justify-center pt-3 pb-2 bg-inherit">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
            aria-hidden
          />
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-5 pb-4">
          <h2 id="profile-more-title" className="font-display text-[18px] font-semibold text-text-primary">
            Options
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] w-10 h-10 rounded-[12px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors -mr-2"
            aria-label="Close"
          >
            <IconX className="w-5 h-5" />
          </button>
        </header>

        <div className="px-4 pb-8 space-y-6">
          {/* Section 1: Creator / Account */}
          <section className="space-y-1">
            <div
              className="rounded-[16px] p-2 space-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {isOwner && (
                <MenuRow
                  href="/settings"
                  icon={IconSettings}
                  label="Edit Profile"
                  onClick={onClose}
                />
              )}
              <MenuRow
                icon={IconShare}
                label="Share Profile"
                onClick={() => {
                  onClose();
                  onShareProfile?.();
                }}
              />
              <MenuRow href="/leaderboard" icon={IconTrophy} label="Leaderboard" onClick={onClose} />
              {isOwner && (
                <MenuRow
                  href="/wallet"
                  icon={IconGift}
                  label="Wallet / Balance"
                  onClick={onClose}
                />
              )}
            </div>
          </section>

          {/* Section 2: Preferences */}
          <section className="space-y-1">
            <div
              className="rounded-[16px] p-2 space-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <MenuRow
                href="/settings#notifications"
                icon={IconBell}
                label="Notifications"
                onClick={onClose}
              />
              <MenuRow
                href="/settings#language"
                icon={IconCompass}
                label="Language"
                onClick={onClose}
              />
              <MenuRow
                href="/settings#playback"
                icon={IconPlay}
                label="Playback / Data Saver"
                onClick={onClose}
              />
            </div>
          </section>

          {/* Section 3: Privacy & Security */}
          <section className="space-y-1">
            <div
              className="rounded-[16px] p-2 space-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <MenuRow
                href="/settings#privacy"
                icon={IconShieldCheck}
                label="Privacy"
                onClick={onClose}
              />
              <MenuRow
                href="/settings#security"
                icon={IconShieldCheck}
                label="Security & Permissions"
                onClick={onClose}
              />
            </div>
          </section>

          {/* Section 4: Support */}
          <section className="space-y-1">
            <div
              className="rounded-[16px] p-2 space-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <MenuRow
                href="/contact"
                icon={IconQuestionMarkCircle}
                label="Help Center"
                onClick={onClose}
              />
            </div>
          </section>

          {/* Section 5: Log Out */}
          {isOwner && (
            <section className="pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 min-h-[52px] px-4 rounded-[16px] font-semibold text-[15px] text-red-400 hover:bg-red-500/10 active:bg-red-500/15 transition-colors"
                style={{
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <IconArrowPath className="w-5 h-5" />
                Log Out
              </button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
