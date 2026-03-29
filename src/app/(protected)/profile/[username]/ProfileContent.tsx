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

/** Sticky tabs sit below ProfileTopBar (~48px). */
const TAB_STICKY_TOP = 'top-12';

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
    <div className="w-full min-w-0">
      <div
        className={cn(
          'sticky z-30 border-b border-white/[0.06] bg-[#050505]/95 backdrop-blur-md supports-[backdrop-filter]:bg-[#050505]/88',
          TAB_STICKY_TOP
        )}
      >
        <div className="flex gap-1 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'shrink-0 touch-manipulation rounded-full px-4 py-2 text-[13px] font-semibold tracking-tight transition-colors duration-200',
                  active
                    ? 'bg-[#B01028]/90 text-white shadow-[0_4px_20px_rgba(176,16,40,0.25)]'
                    : 'text-white/38 hover:bg-white/[0.05] hover:text-white/65'
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
            <div className="flex flex-col items-center px-6 pb-20 pt-16 text-center">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08]"
                style={{
                  background: 'linear-gradient(145deg, rgba(176,16,40,0.12), rgba(255,255,255,0.03))',
                }}
              >
                <Sparkles className="h-8 w-8 text-[#c41230]/90" strokeWidth={1.35} aria-hidden />
              </div>
              <p className="font-display text-lg font-semibold tracking-tight text-white">No performances yet</p>
              <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-white/42">
                {isOwner
                  ? 'Share your first performance with the community.'
                  : 'When this creator posts, performances appear here.'}
              </p>
              {isOwner ? (
                <Link
                  href="/upload"
                  className="mt-8 inline-flex h-12 min-h-[48px] touch-manipulation items-center justify-center rounded-full bg-[#B01028] px-10 font-display text-[14px] font-semibold text-white shadow-[0_8px_32px_rgba(176,16,40,0.35)] transition-all duration-200 hover:bg-[#c41230] active:scale-[0.98]"
                >
                  Upload performance
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-1 px-2 pb-12 pt-3">
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
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <p className="font-display text-[16px] font-semibold text-white">No likes yet</p>
              <p className="mt-2 max-w-xs text-[13px] text-white/40">Performances you like show here.</p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-3 gap-1 px-2 pb-12 pt-3">
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
        <div className="space-y-0 px-3 pb-12 pt-3">
          {challenges.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-16 text-center">
              <p className="font-display text-[16px] font-semibold text-white">No challenges yet</p>
              <p className="mt-2 max-w-xs text-[13px] text-white/40">Entries you join appear here.</p>
              <Link
                href="/challenges"
                className="mt-6 text-[13px] font-semibold text-[#c41230] transition-colors hover:text-[#e84860]"
              >
                Browse challenges
              </Link>
            </div>
          ) : (
            challenges.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border-b border-white/[0.06] py-3.5 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate pr-3 text-[14px] font-medium text-white/90">{c.name}</span>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    c.status === 'Winner' ? 'bg-[#B01028]/20 text-[#f0b8c0]' : 'bg-white/[0.06] text-white/45'
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
        <div className="space-y-0 px-4 pb-16 pt-4">
          {about.country ? (
            <div className="border-b border-white/[0.06] py-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Location</span>
              <p className="mt-1.5 text-[15px] font-medium text-white/85">{about.country}</p>
            </div>
          ) : null}
          {about.talentCategory ? (
            <div className="border-b border-white/[0.06] py-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Style</span>
              <p className="mt-1.5 text-[15px] font-medium text-white/85">{about.talentCategory}</p>
            </div>
          ) : null}
          {about.joinedDate ? (
            <div className="border-b border-white/[0.06] py-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Joined</span>
              <p className="mt-1.5 text-[15px] font-medium text-white/85">{about.joinedDate}</p>
            </div>
          ) : null}
          <div className="py-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Bio</span>
            {about.story.trim() ? (
              <p className="mt-1.5 leading-relaxed text-[14px] text-white/50">{about.story}</p>
            ) : (
              <p className="mt-1.5 text-[14px] italic text-white/22">No bio yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
