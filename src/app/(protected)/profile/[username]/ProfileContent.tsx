'use client';

import { useState } from 'react';
import { Clapperboard } from 'lucide-react';
import ProfileVideoThumbnail from './ProfileVideoThumbnail';
import { cn } from '@/lib/utils';

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
    <div className="w-full min-w-0">
      <div className="mt-8 border-b border-white/5">
        <div className="flex h-12 gap-8 overflow-x-auto px-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex h-12 shrink-0 touch-manipulation items-center border-b-2 text-[14px] transition-all duration-150 ease-out',
                  active
                    ? 'border-[#E31B23] font-bold text-white'
                    : 'border-transparent font-medium text-gray-500 hover:text-white/80'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'videos' && (
        <>
          {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-10 py-20 text-center">
              <Clapperboard className="mb-4 h-12 w-12 text-gray-700" strokeWidth={1.5} aria-hidden />
              <p className="font-display text-[18px] font-bold text-white">No performances yet</p>
              <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-gray-500">
                {isOwner
                  ? 'Upload a take — your grid appears here with views and reactions.'
                  : 'Performances show here when this creator posts.'}
              </p>
              {isOwner ? (
                <a
                  href="/challenges"
                  className="mt-6 inline-flex h-[48px] touch-manipulation items-center justify-center rounded-full bg-[#E31B23] px-8 font-display text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)] transition-all duration-150 ease-out hover:brightness-110 active:scale-[0.98]"
                >
                  Start your first challenge
                </a>
              ) : null}
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-2 px-4 pb-8 pt-4 sm:gap-2.5">
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
            <div className="flex flex-col items-center justify-center px-10 py-16 text-center">
              <p className="mb-2 text-[18px] font-bold text-white">No likes yet</p>
              <p className="max-w-sm text-[14px] leading-relaxed text-gray-500">
                {isOwner ? 'Videos you like will appear here.' : 'No liked videos to show.'}
              </p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-2 px-4 pb-8 pt-4 sm:gap-2.5">
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
        <div className="space-y-3 px-4 pb-8 pt-4">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="mb-2 text-[18px] font-bold text-white">No challenges yet</p>
              <p className="max-w-sm text-[14px] leading-relaxed text-gray-500">Challenge entries show here when available.</p>
            </div>
          ) : null}
          {challenges.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-2 rounded-[20px] border border-white/5 bg-[#0A0A0A] p-4 shadow-[0_8px_22px_rgba(0,0,0,0.28)] transition-all duration-150 ease-out sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-[15px] font-semibold text-white">{c.name}</span>
              <span
                className={`w-fit rounded-lg px-3 py-1 text-[13px] font-semibold ${
                  c.status === 'Winner' ? 'bg-[#E31B23]/20 text-[#E31B23]' : 'bg-white/5 text-gray-400'
                }`}
              >
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="mx-4 mt-4 rounded-[20px] border border-white/5 bg-[#0A0A0A] p-4 pb-8 shadow-[0_8px_22px_rgba(0,0,0,0.28)]">
          <div className="space-y-4 text-[14px]">
            {about.country ? (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Country</span>
                <p className="mt-1 text-[15px] font-semibold text-white">{about.country}</p>
              </div>
            ) : null}
            {about.talentCategory ? (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Talent category</span>
                <p className="mt-1 text-[15px] font-semibold text-white">{about.talentCategory}</p>
              </div>
            ) : null}
            {about.joinedDate ? (
              <div>
                <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Joined</span>
                <p className="mt-1 text-[15px] font-semibold text-white">{about.joinedDate}</p>
              </div>
            ) : null}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">About</span>
              {about.story.trim() ? (
                <p className="mt-1 text-[13px] leading-relaxed text-gray-400">{about.story}</p>
              ) : (
                <p className="mt-1 text-[13px] italic text-gray-600">No bio yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
