'use client';

import { useState } from 'react';
import VideoCard from '@/components/video/VideoCard';
import ProfileVideoThumbnail from './ProfileVideoThumbnail';
import type { VideoCardBadgeVariant } from '@/components/video/VideoCard';

function mapBadgeVariant(badge?: string | null): VideoCardBadgeVariant | undefined {
  if (!badge) return undefined;
  if (badge === 'Rising Talent') return 'rising';
  if (badge === 'Trending') return 'trending';
  if (badge.toLowerCase().includes('new')) return 'new';
  return undefined;
}

const TABS = [
  { id: 'videos', label: 'Videos' },
  { id: 'liked', label: 'Liked' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'about', label: 'About' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface VideoItem {
  id: string;
  title: string;
  badge?: string | null;
  likes: number;
  views: number;
  votes: number;
  talentScore?: number | null;
  thumbnailUrl?: string | null;
  /** Own profile only: e.g. "⏳ Processing", "🎵 Analyzing audio" */
  processingLabel?: string | null;
  creatorId?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  commentPermission?: 'EVERYONE' | 'FOLLOWERS' | 'FOLLOWING' | 'OFF';
}

interface LikedVideoItem {
  id: string;
  title: string;
  creator: string;
  likes: number;
  views: number;
  votes: number;
  thumbnailUrl?: string | null;
}

interface ChallengeItem {
  id: string;
  name: string;
  status: string;
}

interface AboutData {
  country: string | null;
  talentCategory: string | null;
  joinedDate: string | null;
  story: string;
}

interface ProfileContentProps {
  videos: VideoItem[];
  likedVideos: LikedVideoItem[];
  challenges: ChallengeItem[];
  about: AboutData;
  isOwner?: boolean;
  /** Profile user id — passed to owner menu on thumbnails */
  profileUserId?: string;
}

export default function ProfileContent({
  videos,
  likedVideos,
  challenges,
  about,
  isOwner,
  profileUserId,
}: ProfileContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('videos');

  return (
    <div className="mt-6 md:mt-8">
      {/* Tab bar - 52px height, active underline #ff2a4d */}
      <div
        className="flex items-center gap-5 md:gap-8 border-b border-[rgba(255,255,255,0.08)] mb-6 overflow-x-auto no-scrollbar"
        style={{ height: 52 }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className="relative h-full flex items-center text-[14px] font-medium transition-colors pb-0.5"
            style={{
              color: activeTab === tab.id ? '#ffffff' : '#9ba7b8',
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: '#ff2a4d' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'videos' && (
        <>
          {videos.length === 0 ? (
            <div
              className="rounded-[20px] border border-[rgba(255,255,255,0.08)] px-5 py-8 text-center max-w-xl mx-auto"
              style={{
                background: 'rgba(10,12,18,0.9)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <p className="text-[15px] font-medium text-white mb-2">
                No performances yet
              </p>
              <p className="text-[13px] text-text-muted mb-5">
                When {isOwner ? 'you upload' : 'this creator uploads'} a performance, it will appear here with views, votes and reactions.
              </p>
              {isOwner && (
                <a
                  href="/upload"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-[999px] text-[13px] font-semibold text-white transition-all hover:opacity-95 hover:shadow-[0_10px_30px_rgba(177,18,38,0.45)]"
                  style={{
                    background: 'linear-gradient(135deg,#c4122f,#e11d48)',
                    boxShadow: '0 10px 30px rgba(196,18,47,0.55)',
                  }}
                >
                  Upload your first performance
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] md:gap-4">
              {videos.map((v) => (
                <ProfileVideoThumbnail
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl}
                  viewsCount={v.views}
                  processingLabel={v.processingLabel ?? undefined}
                  creatorId={v.creatorId ?? profileUserId}
                  visibility={v.visibility}
                  commentPermission={v.commentPermission}
                  showOwnerMenu={!!isOwner}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'liked' && (
        <>
          {likedVideos.length === 0 ? (
            <p className="text-[14px] text-text-muted py-6 text-center max-w-md mx-auto">
              {isOwner ? 'Videos you like will appear here.' : 'No liked videos to show.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] md:gap-4">
              {likedVideos.map((v) => (
                <ProfileVideoThumbnail
                  key={v.id}
                  id={v.id}
                  title={v.title}
                  thumbnailUrl={v.thumbnailUrl}
                  viewsCount={v.views}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-3 max-w-2xl w-full mx-auto">
          {challenges.length === 0 ? (
            <p className="text-[14px] text-text-muted py-6">No challenge entries yet.</p>
          ) : null}
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 rounded-[16px] border border-[rgba(255,255,255,0.08)]"
              style={{
                background: 'rgba(18,22,31,0.7)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <span className="font-medium text-white">{c.name}</span>
              <span
                className="text-[13px] font-semibold px-3 py-1 rounded-[8px] w-fit"
                style={{
                  background: c.status === 'Winner' ? 'rgba(177,18,38,0.25)' : 'rgba(255,255,255,0.08)',
                  color: c.status === 'Winner' ? '#ff2a4d' : '#9ba7b8',
                }}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'about' && (
        <div
          className="rounded-[24px] p-6 md:p-8 max-w-[720px] w-full mx-auto border border-[rgba(255,255,255,0.08)]"
          style={{
            background: 'rgba(18,22,31,0.7)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="space-y-4 text-[14px]">
            {about.country ? (
              <div>
                <span className="text-[12px] uppercase tracking-wider" style={{ color: '#9ba7b8' }}>
                  Country
                </span>
                <p className="font-medium text-white mt-0.5">{about.country}</p>
              </div>
            ) : null}
            {about.talentCategory ? (
              <div>
                <span className="text-[12px] uppercase tracking-wider" style={{ color: '#9ba7b8' }}>
                  Talent category
                </span>
                <p className="font-medium text-white mt-0.5">{about.talentCategory}</p>
              </div>
            ) : null}
            {about.joinedDate ? (
              <div>
                <span className="text-[12px] uppercase tracking-wider" style={{ color: '#9ba7b8' }}>
                  Joined
                </span>
                <p className="font-medium text-white mt-0.5">{about.joinedDate}</p>
              </div>
            ) : null}
            <div>
              <span className="text-[12px] uppercase tracking-wider" style={{ color: '#9ba7b8' }}>
                About
              </span>
              {about.story.trim() ? (
                <p className="text-[14px] leading-relaxed mt-0.5" style={{ color: '#B7BDC7' }}>
                  {about.story}
                </p>
              ) : (
                <p className="text-[14px] leading-relaxed mt-0.5 italic" style={{ color: '#6b7280' }}>
                  No bio yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
