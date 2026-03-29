'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import ProfileVideoThumbnail from './ProfileVideoThumbnail';
import { cn } from '@/lib/utils';

type TabId = 'videos' | 'liked' | 'challenges' | 'about';

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
  visibility?: import('@prisma/client').VideoVisibility;
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
  const tabs = useMemo(() => {
    const t: { id: TabId; label: string }[] = [{ id: 'videos', label: 'Performances' }];
    if (isOwner) {
      t.push({ id: 'liked', label: 'Liked' });
      t.push({ id: 'challenges', label: 'Challenges' });
    }
    t.push({ id: 'about', label: 'About' });
    return t;
  }, [isOwner]);

  const [activeTab, setActiveTab] = useState<TabId>('videos');

  useEffect(() => {
    const ids = new Set(tabs.map((x) => x.id));
    if (!ids.has(activeTab)) setActiveTab('videos');
  }, [tabs, activeTab]);

  return (
    <div className="w-full min-w-0 pt-2">
      <div className="sticky top-[52px] z-30 border-b border-white/[0.06] bg-[#050505]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#050505]/88">
        <div className="flex h-11 gap-1 overflow-x-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 touch-manipulation rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200',
                  active
                    ? 'bg-white/[0.1] text-white'
                    : 'text-white/40 hover:bg-white/[0.04] hover:text-white/70'
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
            <div className="flex flex-col items-center px-8 pb-16 pt-14 text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <Sparkles className="h-7 w-7 text-[#B01028]/90" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="font-display text-[17px] font-semibold tracking-tight text-white">No performances yet</p>
              <p className="mt-2 max-w-[260px] font-sans text-[13px] leading-relaxed text-white/40">
                {isOwner
                  ? 'Your performances appear here. Share your first one with the community.'
                  : 'When this creator posts, their performances show up here.'}
              </p>
              {isOwner ? (
                <Link
                  href="/upload"
                  className="mt-7 inline-flex h-12 min-h-[48px] touch-manipulation items-center justify-center rounded-full bg-[#B01028] px-8 font-display text-[14px] font-semibold text-white shadow-[0_6px_28px_rgba(176,16,40,0.4)] transition-all duration-200 hover:bg-[#c41230] active:scale-[0.98]"
                >
                  Upload performance
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-1.5 px-3 pb-10 pt-4">
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

      {activeTab === 'liked' && isOwner && (
        <>
          {likedVideos.length === 0 ? (
            <div className="flex flex-col items-center px-8 py-14 text-center">
              <p className="font-display text-[16px] font-semibold text-white">No likes yet</p>
              <p className="mt-2 max-w-xs text-[13px] text-white/40">Videos you like will show here.</p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-1.5 px-3 pb-10 pt-4">
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

      {activeTab === 'challenges' && isOwner && (
        <div className="space-y-2 px-3 pb-10 pt-4">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <p className="font-display text-[16px] font-semibold text-white">No challenges yet</p>
              <p className="mt-2 max-w-xs text-[13px] text-white/40">Challenge entries you join appear here.</p>
              <Link
                href="/challenges"
                className="mt-6 text-[13px] font-semibold text-[#c41230] hover:underline"
              >
                Browse challenges
              </Link>
            </div>
          ) : (
            challenges.map((c) => (
              <div
                key={c.id}
                className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-[14px] font-medium text-white">{c.name}</span>
                <span
                  className={cn(
                    'w-fit rounded-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                    c.status === 'Winner' ? 'bg-[#B01028]/20 text-[#f5a0a8]' : 'bg-white/[0.06] text-white/45'
                  )}
                >
                  {c.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'about' && (
        <div className="mx-3 mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 pb-10">
          <div className="space-y-5 text-[13px]">
            {about.country ? (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Location</span>
                <p className="mt-1 text-[15px] font-medium text-white/90">{about.country}</p>
              </div>
            ) : null}
            {about.talentCategory ? (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Style</span>
                <p className="mt-1 text-[15px] font-medium text-white/90">{about.talentCategory}</p>
              </div>
            ) : null}
            {about.joinedDate ? (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Joined</span>
                <p className="mt-1 text-[15px] font-medium text-white/90">{about.joinedDate}</p>
              </div>
            ) : null}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Bio</span>
              {about.story.trim() ? (
                <p className="mt-1 leading-relaxed text-white/55">{about.story}</p>
              ) : (
                <p className="mt-1 italic text-white/25">No bio yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
