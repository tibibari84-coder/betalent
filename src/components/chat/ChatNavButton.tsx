'use client';

import { IconChat } from '@/components/ui/Icons';
import { useChatPanel } from '@/contexts/ChatPanelContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';

const TOPBAR_TRANSITION = 'transition-all duration-150 ease-out';
const ICON_BTN =
  'relative inline-flex items-center justify-center shrink-0 h-[var(--utility-btn-size)] w-[var(--utility-btn-size)] min-h-[var(--utility-btn-size)] min-w-[var(--utility-btn-size)] rounded-[10px] text-white/80 hover:text-white/95 hover:bg-white/[0.06] hover:scale-[1.02] active:scale-[0.98] ' +
  TOPBAR_TRANSITION;

export function ChatNavButton() {
  const { t } = useI18n();
  const { openPanel, closePanel, isOpen, dmUnread } = useChatPanel();

  return (
    <button
      type="button"
      onClick={() => (isOpen ? closePanel() : openPanel())}
      className={cn(ICON_BTN)}
      aria-label={t('topbar.messages')}
    >
      <IconChat className="w-[var(--utility-icon-size)] h-[var(--utility-icon-size)] shrink-0" />
      {dmUnread > 0 ? (
        <span
          className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center leading-none shadow-sm"
          aria-hidden
        >
          {dmUnread > 99 ? '99+' : dmUnread}
        </span>
      ) : null}
    </button>
  );
}
