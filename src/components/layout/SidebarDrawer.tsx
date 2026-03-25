'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconX } from '@/components/ui/Icons';
import Sidebar from './Sidebar';

const DRAWER_STYLE: React.CSSProperties = {
  background: 'rgba(8,8,10,0.95)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  boxShadow: '4px 0 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03)',
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
        className="fixed inset-0 z-[60] bg-black/60 transition-opacity duration-200 lg:hidden"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Enter' && onClose()}
      />
      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="fixed left-0 top-0 z-[61] h-full w-[280px] max-w-[85vw] flex flex-col transition-transform duration-300 ease-out lg:hidden"
        style={{
          ...DRAWER_STYLE,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center justify-between shrink-0 px-4 py-3 border-b border-white/[0.06]">
          <span className="font-display text-[15px] font-semibold text-white tracking-wide">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
          <Sidebar variant="drawer" />
        </div>
      </aside>
    </>,
    document.body
  );
}
