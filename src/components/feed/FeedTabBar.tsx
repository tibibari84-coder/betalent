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
      className="relative flex items-center gap-1 min-h-[40px] rounded-[12px] border border-white/[0.08] bg-black/35 px-1.5 py-1 shrink-0 min-w-0 overflow-x-auto overflow-y-hidden backdrop-blur-xl [scrollbar-width:thin]"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="relative h-full min-h-[36px] rounded-[10px] px-2.5 sm:px-3 flex items-center gap-1 text-[12px] sm:text-[13px] font-medium transition-colors shrink-0"
          style={{
            color: activeTab === tab.id ? '#f5f5f5' : (tab as { comingSoon?: boolean }).comingSoon ? '#6b7280' : '#9ca3af',
            background: activeTab === tab.id ? 'rgba(255,255,255,0.06)' : 'transparent',
          }}
        >
          {tab.label}
          {(tab as { comingSoon?: boolean }).comingSoon && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">Soon</span>
          )}
          {activeTab === tab.id && (
            <>
              <span className="absolute bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-[#c4122f]" />
              <span className="absolute bottom-0 left-3 right-3 h-[1px] rounded-full bg-[#ff4a6a]/60 blur-[0.5px]" />
            </>
          )}
        </button>
      ))}
    </div>
  );
}
