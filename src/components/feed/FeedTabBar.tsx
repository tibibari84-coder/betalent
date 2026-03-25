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
      className="flex items-center gap-6 laptop:gap-8 min-h-[52px] border-b border-white/[0.07] shrink-0 min-w-0 overflow-x-auto overflow-y-hidden"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className="relative h-full min-h-[48px] flex items-center gap-1.5 text-[14px] font-medium transition-colors shrink-0 pb-px -mb-px"
          style={{
            color: activeTab === tab.id ? '#f5f5f5' : (tab as { comingSoon?: boolean }).comingSoon ? '#6b7280' : '#9ca3af',
          }}
        >
          {tab.label}
          {(tab as { comingSoon?: boolean }).comingSoon && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">Soon</span>
          )}
          {activeTab === tab.id && (
            <span
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{ backgroundColor: '#c4122f' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
