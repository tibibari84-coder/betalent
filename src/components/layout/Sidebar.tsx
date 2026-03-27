'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconCompass,
  IconTrendingUp,
  IconUpload,
  IconAward,
  IconUsers,
  IconSettings,
  IconChat,
} from '@/components/ui/Icons';
import { StarterTalentCarousel } from './StarterTalentCarousel';
import { useChatPanel } from '@/contexts/ChatPanelContext';
import { useI18n } from '@/contexts/I18nContext';
import { SIDEBAR_BASE_STYLE, SIDEBAR_ACTIVE_STYLE } from '@/constants/card-design-system';

const NAV_ITEMS = [
  { href: '/explore', labelKey: 'nav.explore', icon: IconCompass, desc: 'Discover new talent' },
  { href: '/feed', labelKey: 'nav.forYou', icon: IconTrendingUp, desc: 'Videos picked for you' },
  { href: '/challenges', labelKey: 'nav.challenges', icon: IconAward, desc: 'Browse and join weekly challenges' },
  { href: '/upload', labelKey: 'nav.upload', icon: IconUpload, desc: 'Share your performance' },
  { href: '/leaderboard', labelKey: 'nav.leaderboard', icon: IconAward, desc: 'Top ranked creators' },
  { href: '/following', labelKey: 'nav.following', icon: IconUsers, desc: 'People you follow' },
  { href: '/profile/me', labelKey: 'nav.profile', icon: IconUsers, desc: 'Your creator page' },
  { href: '/settings', labelKey: 'nav.settings', icon: IconSettings, desc: 'Account and app settings' },
] as const;

function SidebarMessagesButton({ isDrawer = false }: { isDrawer?: boolean }) {
  const { t } = useI18n();
  const { openPanel, dmUnread } = useChatPanel();

  return (
    <button
      type="button"
      onClick={() => openPanel()}
      className="
        group relative min-w-0 w-full overflow-hidden
        transition-all duration-200 ease-out
        text-left
      "
      style={SIDEBAR_BASE_STYLE}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
        }}
      />
      <div
        className={
          isDrawer
            ? 'relative z-[1] grid w-full grid-cols-[30px_minmax(0,1fr)_14px] items-center rounded-[14px] px-3 sm:grid-cols-[34px_minmax(0,1fr)_16px] sm:rounded-[16px] sm:px-4 h-[50px] sm:h-[54px]'
            : 'relative z-[1] flex items-center rounded-[16px] px-4 xl:px-[18px] py-3 w-full'
        }
      >
        <span
          className={
            isDrawer
              ? 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] sm:h-[34px] sm:w-[34px] sm:rounded-[10px]'
              : 'mr-3 shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px]'
          }
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <IconChat className={isDrawer ? 'h-[15px] w-[15px] text-white sm:h-[17px] sm:w-[17px]' : 'w-4 h-4 text-white'} aria-hidden />
        </span>
        <div className={isDrawer ? 'min-w-0 pl-2.5 sm:pl-3' : 'min-w-0 flex-1'}>
          <span className="flex items-center gap-2 min-w-0">
            <span className={`block truncate font-semibold leading-[1.2] text-[#F3F4F6] ${isDrawer ? 'text-[13px] sm:text-[14px]' : 'text-[14px]'}`}>
              {t('nav.messages')}
            </span>
            {dmUnread > 0 ? (
              <span
                className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-[10px] font-bold text-white flex items-center justify-center"
                aria-hidden
              >
                {dmUnread > 99 ? '99+' : dmUnread}
              </span>
            ) : null}
          </span>
          <span className={`block truncate leading-[1.2] text-[#87909c] ${isDrawer ? 'mt-px text-[10.5px] sm:text-[11.5px]' : 'mt-0.5 text-[11px]'}`}>
            {t('nav.messagesDesc')}
          </span>
        </div>
        <span
          className={`shrink-0 leading-none text-[#6f7782] transition-transform duration-200 group-hover:translate-x-[2px] ${isDrawer ? 'justify-self-end text-[14px] sm:text-[16px]' : 'ml-2.5 text-[16px]'}`}
          aria-hidden
        >
          ›
        </span>
      </div>
    </button>
  );
}

export default function Sidebar({ variant = 'sidebar' }: { variant?: 'sidebar' | 'drawer' }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isDrawer = variant === 'drawer';

  return (
    <aside
      className={`
        shrink-0 min-w-0
        ${isDrawer ? 'block' : 'hidden lg:block'}
      `}
      style={{ width: isDrawer ? '100%' : 'var(--shell-sidebar)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className={`flex flex-col ${isDrawer ? 'gap-2.5 sm:gap-3' : 'gap-2.5'}`}>
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, desc }) => {
          const isActive =
            pathname === href || (pathname?.startsWith(href + '/') ?? false);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="
                group relative min-w-0 w-full overflow-hidden
        transition-all duration-200 ease-out
      "
      style={SIDEBAR_BASE_STYLE}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
        }}
      />
              <div
                className={
                  isDrawer
                    ? 'relative z-[1] grid w-full grid-cols-[30px_minmax(0,1fr)_14px] items-center rounded-[14px] px-3 sm:grid-cols-[34px_minmax(0,1fr)_16px] sm:rounded-[16px] sm:px-4 h-[50px] sm:h-[54px]'
                    : 'relative z-[1] flex items-center rounded-[16px] px-4 xl:px-[18px] py-3 w-full'
                }
                style={isActive ? SIDEBAR_ACTIVE_STYLE : SIDEBAR_BASE_STYLE}
              >
                <span
                  className={
                    isDrawer
                      ? 'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] sm:h-[34px] sm:w-[34px] sm:rounded-[10px]'
                      : 'mr-3 shrink-0 flex items-center justify-center w-10 h-10 rounded-[12px]'
                  }
                  style={{
                    background: isActive ? 'linear-gradient(180deg, rgba(180,40,60,0.12) 0%, rgba(120,20,40,0.06) 100%)' : 'rgba(255,255,255,0.035)',
                    border: isActive ? '1px solid rgba(255,80,100,0.18)' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <Icon className={isDrawer ? 'h-[15px] w-[15px] text-white sm:h-[17px] sm:w-[17px]' : 'w-4 h-4 text-white'} aria-hidden />
                </span>

                <div className={isDrawer ? 'min-w-0 pl-3' : 'min-w-0 flex-1'}>
                  <span
                    className={`
                      block truncate font-semibold leading-[1.2]
                      ${isDrawer ? 'text-[14px]' : 'text-[14px]'}
                      ${isActive ? 'text-white' : 'text-[#F3F4F6]'}
                    `}
                  >
                    {t(labelKey)}
                  </span>

                  <span
                    className={`
                      block truncate leading-[1.2]
                      ${isDrawer ? 'mt-px text-[10.5px] sm:text-[11.5px]' : 'mt-0.5 text-[11px]'}
                      ${isActive ? 'text-[#efc1ca]' : 'text-[#87909c]'}
                    `}
                  >
                    {desc}
                  </span>
                </div>

                <span
                  className={`
                    shrink-0 leading-none
                    transition-transform duration-200 group-hover:translate-x-[2px]
                    ${isDrawer ? 'justify-self-end text-[14px] sm:text-[16px]' : 'ml-2.5 text-[16px]'}
                    ${isActive ? 'text-[#f0b7c3]' : 'text-[#6f7782]'}
                  `}
                  aria-hidden
                >
                  ›
                </span>
              </div>
            </Link>
          );
        })}

        <SidebarMessagesButton isDrawer={isDrawer} />

        <div className={isDrawer ? 'hidden sm:block mt-0.5' : ''}>
          <StarterTalentCarousel />
        </div>
      </div>
    </aside>
  );
}
