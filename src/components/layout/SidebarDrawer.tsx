'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/components/ui/Icons';
import Sidebar from './Sidebar';

const DRAWER_STYLE: React.CSSProperties = {
  background: 'rgba(8,8,10,0.96)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  boxShadow: '4px 0 40px rgba(0,0,0,0.34), 0 0 0 1px rgba(255,255,255,0.03)',
};

export function SidebarDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [hasMounted, isOpen]);

  useEffect(() => {
    if (!hasMounted) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [hasMounted, isOpen, onClose]);

  if (!hasMounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={-1}
        aria-label="Close menu"
        className="fixed inset-0 z-[60] bg-black/55 transition-opacity duration-200 ease-out lg:hidden"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      />
      {/* Drawer panel — narrow sheet (Meta-style): leaves backdrop visible; not full-bleed width */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="fixed left-0 top-0 z-[61] flex h-[100dvh] max-h-[100dvh] w-[min(276px,76vw)] flex-col overflow-hidden rounded-r-[20px] shadow-[8px_0_48px_rgba(0,0,0,0.45)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[min(300px,82vw)] md:w-[min(316px,85vw)] lg:hidden"
        style={{
          ...DRAWER_STYLE,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-3 sm:h-14 sm:px-4">
          <span className="font-display text-[13px] font-semibold tracking-wide text-white sm:text-[15px]">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <IconX className="w-[20px] h-[20px]" />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Sidebar variant="drawer" />
        </div>
      </aside>
    </>,
    document.body
  );
}
