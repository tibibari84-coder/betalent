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
      className="relative flex items-center gap-2 min-h-[52px] rounded-[14px] border border-white/[0.1] bg-white/[0.03] px-2.5 py-1.5 shrink-0 min-w-0 overflow-x-auto overflow-y-hidden backdrop-blur-xl"
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 30px rgba(0,0,0,0.28)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="relative h-full min-h-[44px] rounded-[11px] px-3.5 flex items-center gap-1.5 text-[13px] sm:text-[14px] font-medium transition-colors shrink-0"
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
              <span className="absolute bottom-[3px] left-3 right-3 h-[2px] rounded-full bg-[#c4122f]" />
              <span className="absolute -bottom-[1px] left-4 right-4 h-[1px] rounded-full bg-[#ff4a6a]/80 blur-[0.5px]" />
            </>
          )}
        </button>
      ))}
    </div>
  );
}
