'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { LOCALE_LABELS } from '@/constants/locales';
import { SUPPORTED_LOCALES } from '@/lib/validations';
import type { SupportedLocale } from '@/lib/validations';
import { cn } from '@/lib/utils';

const panelClass =
  'absolute z-[70] mt-2 min-w-[200px] max-w-[min(calc(100vw-16px),280px)] rounded-xl border border-white/[0.1] py-1 shadow-[0_20px_60px_rgba(0,0,0,0.5)]';
const panelStyle: CSSProperties = {
  background: 'rgba(20,20,24,0.88)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
};

type Props = {
  className?: string;
  /** Narrow top bar: icon + 2-letter code only */
  compact?: boolean;
  align?: 'left' | 'right';
};

export function LanguageSelector({ className, compact = false, align = 'right' }: Props) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pick(next: SupportedLocale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setLocale(next);
    router.refresh();
    setOpen(false);
  }

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('i18n.openLanguageMenu')}
        className={cn(
          'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.05] px-2.5 text-left text-[12px] font-medium text-white/90 shadow-sm transition-all duration-150 ease-out hover:bg-white/[0.09] active:scale-[0.97]',
          compact ? 'min-w-0 px-2' : 'min-w-[5.5rem]'
        )}
      >
        <Globe className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
        <span className="tabular-nums tracking-tight">{locale.toUpperCase()}</span>
        {!compact && <span className="hidden min-[380px] inline max-w-[5.5rem] truncate text-white/55">{LOCALE_LABELS[locale]}</span>}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-white/45 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={t('i18n.language')}
          className={cn(panelClass, align === 'right' ? 'right-0' : 'left-0')}
          style={panelStyle}
        >
          {SUPPORTED_LOCALES.map((code) => (
            <li key={code} role="none">
              <button
                type="button"
                role="option"
                aria-selected={code === locale}
                onClick={() => pick(code)}
                className={cn(
                  'flex w-full min-h-[44px] items-center justify-between gap-3 px-3 py-2 text-left text-[13px] font-medium transition-colors duration-150',
                  code === locale ? 'bg-white/[0.1] text-white' : 'text-white/85 hover:bg-white/[0.06]'
                )}
              >
                <span>{LOCALE_LABELS[code]}</span>
                <span className="text-[11px] uppercase tracking-wide text-white/40">{code}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
