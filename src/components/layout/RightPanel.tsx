'use client';

/**
 * BETALENT right panel
 * Premium floating cards: wallet, challenge promo, ranking explanation, onboarding
 * No fake names or fake lists — real data or premium fallback only
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletSummaryCard } from '@/components/wallet/WalletSummaryCard';
import {
  IconRadio,
  IconPlay,
  IconTrophy,
  IconUser,
  IconCompass,
} from '@/components/ui/Icons';
import { PanelEmptyState } from '@/components/shared/PanelEmptyState';
import { LiveWindowDisplay } from '@/components/challenge/LiveWindowDisplay';
import { isRegionalWindowOpenNow } from '@/lib/challenge-status';
import { SuggestedCreatorsPanel } from '@/components/recommendations/SuggestedCreatorsPanel';

import { RIGHT_PANEL_CARD_GAP, RIGHT_PANEL_CARD_STYLE } from '@/constants/card-design-system';

const PANEL_STACK_STYLE = {
  gap: RIGHT_PANEL_CARD_GAP,
} as const;

const FLOATING_CARD_STYLE = RIGHT_PANEL_CARD_STYLE;

const SOFT_PILL_STYLE = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.06)',
} as const;

function UtilityModuleCard({
  title,
  icon: Icon,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="w-full min-w-0 shrink-0 rounded-[16px] p-4 transition-all duration-200 ease-out opacity-[0.96]"
      style={FLOATING_CARD_STYLE}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-[13px] font-semibold leading-[1.25] text-white/90 tracking-[-0.01em]">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Icon className="h-[15px] w-[15px] text-[#F2B6C0]" aria-hidden />
          </span>
          <span className="truncate">{title}</span>
        </h3>

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="shrink-0 text-[12px] font-medium text-accent/90 transition hover:text-accent"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function EmptyOrSkeleton({
  loading,
  title,
  description,
  ctaLabel,
  ctaHref,
  icon,
}: {
  loading: boolean;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-[12px] px-2.5 py-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-white/10 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="h-3 w-20 rounded bg-white/10 animate-pulse" />
              <div className="h-2.5 w-24 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <PanelEmptyState
      title={title}
      description={description}
      ctaLabel={ctaLabel}
      ctaHref={ctaHref}
      icon={icon}
    />
  );
}

/* ========== Ranking Explanation — static premium content ========== */
function RankingExplanationModule() {
  return (
    <UtilityModuleCard
      title="How ranking works"
      icon={IconCompass}
      actionHref="/leaderboard"
      actionLabel="View"
    >
      <p className="text-[14px] text-white/70 leading-[1.55]">
        Rankings are based on real engagement—votes, likes, views, and challenge performance. Top talent rises through genuine community support.
      </p>
    </UtilityModuleCard>
  );
}

function challengeWindowActiveNow(
  windows?: Array<{ startsAt: string; endsAt: string }>
): boolean {
  const now = Date.now();
  return (
    windows?.some((w) => {
      const s = new Date(w.startsAt).getTime();
      const e = new Date(w.endsAt).getTime();
      return now >= s && now <= e;
    }) ?? false
  );
}

/* ========== Weekly Live Challenge — real data from API ========== */
function WeeklyLiveChallengeModule() {
  const [challenge, setChallenge] = useState<{
    slug: string;
    title: string;
    status: string;
    windows?: Array<{ id: string; regionLabel: string; timezone: string; startsAt: string; endsAt: string; status: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/challenges?limit=5')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.challenges) && data.challenges.length > 0) {
          const c = data.challenges[0];
          setChallenge({
            slug: c.slug,
            title: c.title,
            status: c.status ?? 'ENTRY_OPEN',
            windows: c.windows ?? [],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <UtilityModuleCard
      title="Weekly Live Challenge"
      icon={IconRadio}
      actionHref="/challenges"
      actionLabel="Details"
    >
      {challenge ? (
        <div className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[14px] font-semibold leading-tight text-white truncate">
            {challenge.title}
          </p>
          <p className="mt-0.5 text-[12px] leading-[1.35] text-white/55">
            {challenge.status === 'LIVE_ACTIVE' && isRegionalWindowOpenNow(challenge.windows)
              ? 'Regional window active'
              : challenge.status === 'LIVE_ACTIVE'
                ? 'Live phase · check schedule'
                : challenge.status === 'ENTRY_CLOSED'
                  ? 'Entries closed'
                  : challenge.status === 'LIVE_UPCOMING'
                    ? 'Live upcoming'
                    : challenge.status === 'VOTING_CLOSED'
                      ? 'Voting closed'
                      : ['ENTRY_OPEN', 'OPEN'].includes(challenge.status)
                        ? 'Open for entries'
                        : 'View challenge'}
          </p>
          {challenge.windows && challenge.windows.length > 0 && (
            <div className="mt-1.5 text-[11px] text-white/50">
              <LiveWindowDisplay windows={challenge.windows} showEventTimezone={false} variant="inline" />
            </div>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/live/${challenge.slug}`}
              className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[12px] px-3.5 text-[12px] font-semibold text-white/90 border border-white/12 bg-white/[0.06] transition hover:bg-white/[0.1] hover:border-accent/25"
            >
              <IconPlay className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Live page
            </Link>

            <Link
              href={`/challenges/${challenge.slug}`}
              className="inline-flex h-[40px] items-center justify-center rounded-[12px] px-4 text-[12px] font-semibold text-white/80 transition hover:bg-white/[0.07] hover:text-white"
              style={SOFT_PILL_STYLE}
            >
              Join
            </Link>
          </div>
        </div>
      ) : (
        <EmptyOrSkeleton
          loading={loading}
          title="No challenge yet"
          description="Weekly challenges will appear here when they’re live."
          ctaLabel="Browse challenges"
          ctaHref="/challenges"
          icon={<IconRadio className="h-5 w-5" />}
        />
      )}
    </UtilityModuleCard>
  );
}

/* ========== Onboarding Cards — premium guidance, no fake lists ========== */
function OnboardingCardsModule() {
  const cards = [
    { icon: IconPlay, title: 'Become a performer', desc: 'Upload your first performance.', href: '/upload' },
    { icon: IconTrophy, title: 'Compete in challenges', desc: 'Enter weekly competitions.', href: '/challenges' },
    { icon: IconUser, title: 'Build your profile', desc: 'Grow your audience.', href: '/upload' },
  ];
  return (
    <UtilityModuleCard
      title="Get started"
      icon={IconUser}
      actionHref="/explore"
      actionLabel="Explore"
    >
      <div className="space-y-1.5">
        {cards.map(({ icon: Icon, title, desc, href }) => (
          <Link
            key={title}
            href={href}
            className="flex min-w-0 items-center gap-2.5 rounded-[12px] px-3 py-2.5 transition hover:bg-white/[0.04]"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
              style={SOFT_PILL_STYLE}
            >
              <Icon className="h-[14px] w-[14px] text-white/70" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-[1.3] text-white">{title}</p>
              <p className="mt-0.5 truncate text-[11px] leading-[1.3] text-white/50">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </UtilityModuleCard>
  );
}

export default function RightPanel() {
  return (
    <aside
      className="w-full min-w-0 max-w-full flex flex-col"
      role="complementary"
      aria-label="Support and discovery cards"
    >
      <div
        className="flex h-fit w-full min-w-0 flex-col items-stretch"
        style={PANEL_STACK_STYLE}
      >
        {/* WalletSummaryCard marad külön komponens; ha annak a gombja még túl hosszú,
            azt külön a WalletSummaryCard komponensben kell rövidíteni/polírozni */}
        <WalletSummaryCard />

        <SuggestedCreatorsPanel />

        <RankingExplanationModule />
        <WeeklyLiveChallengeModule />
        <OnboardingCardsModule />
      </div>
    </aside>
  );
}
