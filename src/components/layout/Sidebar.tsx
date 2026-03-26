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

function SidebarMessagesButton() {
  const { t } = useI18n();
  const { openPanel, dmUnread } = useChatPanel();

  return (
    <button
      type="button"
      onClick={() => openPanel()}
      className="
        group relative flex items-center min-w-0 w-full overflow-hidden
        rounded-[16px]
        px-4 xl:px-[18px]
        py-3
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
      <span
        className="
          relative z-[1] mr-3 shrink-0
          flex items-center justify-center
          w-10 h-10
          rounded-[12px]
        "
        style={{
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <IconChat className="w-4 h-4 text-white" aria-hidden />
      </span>
      <div className="relative z-[1] min-w-0 flex-1">
        <span className="flex items-center gap-2 min-w-0">
          <span className="block truncate font-semibold leading-[1.2] text-[14px] text-[#F3F4F6]">
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
        <span className="block mt-0.5 truncate text-[11px] leading-[1.25] text-[#87909c]">
          {t('nav.messagesDesc')}
        </span>
      </div>
      <span
        className="relative z-[1] ml-2.5 shrink-0 text-[16px] leading-none text-[#6f7782] transition-transform duration-200 group-hover:translate-x-[2px]"
        aria-hidden
      >
        ›
      </span>
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
      <div className="flex flex-col gap-2.5">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon, desc }) => {
          const isActive =
            pathname === href || (pathname?.startsWith(href + '/') ?? false);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="
                group relative flex items-center min-w-0 w-full overflow-hidden
                rounded-[16px]
                px-4 xl:px-[18px]
                py-3
                transition-all duration-200 ease-out
              "
              style={isActive ? SIDEBAR_ACTIVE_STYLE : SIDEBAR_BASE_STYLE}
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                style={{
                  background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
                }}
              />

              <span
                className="
                  relative z-[1] mr-3 shrink-0
                  flex items-center justify-center
                  w-10 h-10
                  rounded-[12px]
                "
                style={{
                  background: isActive ? 'linear-gradient(180deg, rgba(180,40,60,0.12) 0%, rgba(120,20,40,0.06) 100%)' : 'rgba(255,255,255,0.035)',
                  border: isActive ? '1px solid rgba(255,80,100,0.18)' : '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <Icon className="w-4 h-4 text-white" aria-hidden />
              </span>

              <div className="relative z-[1] min-w-0 flex-1">
                <span
                  className={`
                    block truncate font-semibold leading-[1.2]
                    text-[14px]
                    ${isActive ? 'text-white' : 'text-[#F3F4F6]'}
                  `}
                >
                  {t(labelKey)}
                </span>

                <span
                  className={`
                    block mt-0.5 truncate text-[11px] leading-[1.25]
                    ${isActive ? 'text-[#efc1ca]' : 'text-[#87909c]'}
                  `}
                >
                  {desc}
                </span>
              </div>

                <span
                  className={`
                    relative z-[1] ml-2.5 shrink-0 text-[16px] leading-none
                    transition-transform duration-200 group-hover:translate-x-[2px]
                    ${isActive ? 'text-[#f0b7c3]' : 'text-[#6f7782]'}
                  `}
                aria-hidden
              >
                ›
              </span>
            </Link>
          );
        })}

        <SidebarMessagesButton />

        <StarterTalentCarousel />
      </div>
    </aside>
  );
}
