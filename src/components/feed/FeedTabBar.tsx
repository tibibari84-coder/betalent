'use client';

const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
  { id: 'new-voices', label: 'New Voices' },
  { id: 'challenges', label: 'Challenges' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface FeedTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function FeedTabBar({ activeTab, onTabChange }: FeedTabBarProps) {
  return (
    <div
      className="relative flex min-h-[44px] shrink-0 min-w-0 items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-[16px] border border-white/[0.09] bg-black/45 px-1 py-1 backdrop-blur-xl [scrollbar-width:thin]"
      style={{
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)',
      }}
      role="tablist"
      aria-label="Feed sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className="relative flex h-full min-h-[38px] shrink-0 items-center gap-1 rounded-[12px] px-3 text-[12px] font-semibold tracking-tight transition-colors sm:px-3.5 sm:text-[13px]"
          style={{
            color: activeTab === tab.id ? '#f8fafc' : (tab as { comingSoon?: boolean }).comingSoon ? '#64748b' : '#94a3b8',
            background:
              activeTab === tab.id
                ? 'linear-gradient(180deg, rgba(196,18,47,0.22) 0%, rgba(255,255,255,0.07) 100%)'
                : 'transparent',
            boxShadow: activeTab === tab.id ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : undefined,
          }}
        >
          {tab.label}
          {(tab as { comingSoon?: boolean }).comingSoon && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#64748b]">Soon</span>
          )}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-1 left-3 right-3 h-[2px] rounded-full opacity-90"
              style={{
                background: 'linear-gradient(90deg, transparent, #c4122f, #e11d48, transparent)',
              }}
              aria-hidden
            />
          )}
        </button>
      ))}
    </div>
  );
}
