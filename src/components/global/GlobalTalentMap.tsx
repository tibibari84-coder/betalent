/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import type { RsmGeography } from 'react-simple-maps';
import Link from 'next/link';
import VideoCard from '@/components/video/VideoCard';
import { getAllCountries, getCountryName, getFlagEmoji } from '@/lib/countries';
import type { VideoCardCreator, VideoCardStats } from '@/components/video/VideoCard';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

type CountryTalentResponse = {
  ok: boolean;
  country: { code: string; name: string; flagEmoji: string };
  creatorsCount: number;
  creators: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
    countryCode?: string | null;
    countryName?: string | null;
    country?: string | null;
    isVerified?: boolean;
    verificationLevel?: string | null;
    totalVotes: number;
    videosCount: number;
    creatorTier: string;
  }[];
  videos: {
    id: string;
    title: string | null;
    thumbnailUrl?: string | null;
    viewsCount: number;
    likesCount: number;
    commentsCount: number;
    votesCount: number;
    talentScore: number | null;
    visibility: 'PUBLIC' | 'PRIVATE';
    creator: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string | null;
      countryCode?: string | null;
      countryName?: string | null;
      country?: string | null;
      isVerified?: boolean;
      verificationLevel?: string | null;
    };
    category?: { name: string; slug: string } | null;
    /** When true, show a trending badge on the card (optional from API). */
    isFeatured?: boolean;
  }[];
};

type MapCountry = {
  code: string;
  name: string;
};

const countries = getAllCountries();

const COUNTRY_NAME_INDEX: Record<string, MapCountry> = countries.reduce(
  (acc, c) => {
    acc[c.name.toLowerCase()] = { code: c.code, name: c.name };
    return acc;
  },
  {} as Record<string, MapCountry>
);

function matchCountryCode(name: string | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase();
  const direct = COUNTRY_NAME_INDEX[key];
  if (direct) return direct.code;

  // Fallbacks for common mismatches between world-atlas and ISO names
  const overrides: Record<string, string> = {
    'united states of america': 'US',
    'united states': 'US',
    'russia': 'RU',
    'russian federation': 'RU',
    'bolivia': 'BO',
    'bolivia, plurinational state of': 'BO',
    'venezuela': 'VE',
    'venezuela, bolivarian republic of': 'VE',
    'tanzania': 'TZ',
    'tanzania, united republic of': 'TZ',
    'iran': 'IR',
    'iran, islamic republic of': 'IR',
    'syria': 'SY',
    'syrian arab republic': 'SY',
    'north korea': 'KP',
    'korea, democratic people\'s republic of': 'KP',
    'south korea': 'KR',
    'korea, republic of': 'KR',
    'czech republic': 'CZ',
    'czechia': 'CZ',
    'moldova': 'MD',
    'moldova, republic of': 'MD',
    'laos': 'LA',
    'lao people\'s democratic republic': 'LA',
    'viet nam': 'VN',
    'macedonia': 'MK',
    'north macedonia': 'MK',
    'eswatini': 'SZ',
    'swaziland': 'SZ',
  };
  if (overrides[key]) return overrides[key];

  return null;
}

type Props = {
  initialCountryCode?: string;
};

export function GlobalTalentMap({ initialCountryCode }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(
    initialCountryCode ?? null
  );
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CountryTalentResponse | null>(null);

  useEffect(() => {
    if (!selectedCountry) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/global/countries/${selectedCountry}/talent`,
          { cache: 'no-store' }
        );
        const json = (await res.json()) as CountryTalentResponse;
        if (!res.ok || !json.ok) {
          throw new Error(json && 'message' in json ? (json as any).message : 'Failed to load');
        }
        if (!cancelled) {
          setData(json);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(
            e instanceof Error ? e.message : 'Something went wrong loading this country'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCountry]);

  const handleCountrySelect = (code: string | null) => {
    setSelectedCountry(code);
  };

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        code: c.code,
        label: `${c.flagEmoji} ${c.name}`,
      })),
    []
  );

  const videos = data?.videos ?? [];
  const creators = data?.creators ?? [];
  const activeCountryCode = data?.country.code ?? selectedCountry;
  const activeCountryName = activeCountryCode ? getCountryName(activeCountryCode) : '';
  const activeFlag = activeCountryCode ? getFlagEmoji(activeCountryCode) : '';

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Top header */}
      <section className="space-y-3">
        <h1 className="font-display text-page-title text-white">
          Global Talent Map
        </h1>
        <p className="max-w-[640px] text-[13px] leading-relaxed text-white/70 sm:text-[14px]">
          Discover rising voices, top performers, and new talent from around the world.
          Tap a country on the map or pick from the list to explore its stage.
        </p>
      </section>

      {/* Map + controls */}
      <section className="space-y-4 md:space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[13px] text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: '#c4122f' }}
              />
              <span className="font-medium text-white/80">
                Active country
              </span>
            </span>
            <span className="hidden md:inline text-white/50">
              Hover to preview, click to explore.
            </span>
          </div>
          {/* Country picker – mobile and desktop */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="country-select"
              className="text-[12px] font-medium uppercase tracking-[0.16em] text-white/55"
            >
              Country
            </label>
            <select
              id="country-select"
              className="h-10 min-w-[160px] max-w-[260px] rounded-[12px] bg-[rgba(15,15,18,0.96)] border border-[rgba(255,255,255,0.12)] text-[13px] text-white/90 px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 cursor-pointer"
              value={selectedCountry ?? ''}
              onChange={(e) =>
                handleCountrySelect(e.target.value ? e.target.value : null)
              }
            >
              <option value="">Select country</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* World map */}
        <div
          className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,_rgba(196,18,47,0.24),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(10,10,14,0.95),_#050509)] shadow-glass"
          style={{
            boxShadow:
              '0 24px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <div className="w-full h-[260px] sm:h-[320px] md:h-[360px] lg:h-[420px] xl-screen:h-[460px]">
            <ComposableMap
              projectionConfig={{ scale: 160 }}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo: RsmGeography) => {
                    const rawName = geo.properties.name;
                    const countryName =
                      typeof rawName === 'string' ? rawName : undefined;
                    const code = matchCountryCode(countryName);
                    const isActive =
                      code && activeCountryCode && code === activeCountryCode;
                    const isHovered =
                      code && hoveredCountry && code === hoveredCountry;
                    const baseFill = 'rgba(18,18,24,0.92)';
                    const hoverFill = 'rgba(196,18,47,0.7)';
                    const activeFill = '#c4122f';

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseEnter={() => {
                          if (code) setHoveredCountry(code);
                        }}
                        onMouseLeave={() => {
                          setHoveredCountry(null);
                        }}
                        onClick={() => {
                          if (code) handleCountrySelect(code);
                        }}
                        style={{
                          default: {
                            fill: isActive
                              ? activeFill
                              : isHovered
                              ? hoverFill
                              : baseFill,
                            stroke: 'rgba(255,255,255,0.08)',
                            strokeWidth: 0.35,
                            outline: 'none',
                            transition: 'fill 160ms ease-out, stroke 160ms ease-out',
                          },
                          hover: {
                            fill: code ? hoverFill : baseFill,
                            stroke: 'rgba(255,255,255,0.2)',
                            strokeWidth: 0.5,
                            outline: 'none',
                          },
                          pressed: {
                            fill: activeFill,
                            stroke: 'rgba(255,255,255,0.3)',
                            strokeWidth: 0.6,
                            outline: 'none',
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ComposableMap>
          </div>

          {/* Active country overlay */}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-white/85">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 border border-white/15 text-base">
                {activeFlag || '🌍'}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {activeCountryName || 'Select a country to explore its stage'}
                </p>
                {data?.creatorsCount != null && activeCountryName && (
                  <p className="truncate text-[11px] text-white/60">
                    {data.creatorsCount > 0
                      ? `${data.creatorsCount} creator${
                          data.creatorsCount === 1 ? '' : 's'
                        } from this country`
                      : 'No creators yet — be the first to upload.'}
                  </p>
                )}
              </div>
            </div>
            {activeCountryCode && (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <Link
                  href={`/leaderboard?scope=country&target=creator&period=weekly&countryCode=${activeCountryCode}`}
                  className="inline-flex items-center justify-center rounded-[999px] border border-white/18 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-accent/90 hover:border-accent/80 hover:text-white transition-colors"
                >
                  View country leaderboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="space-y-5 md:space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[14px] text-white/60">
              Loading talent from this country…
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="mx-auto max-w-[560px] rounded-[20px] border border-red-500/30 bg-[rgba(24,4,6,0.9)] px-5 py-4 text-center text-[13px] text-red-100">
            {error}
          </div>
        )}

        {!loading && !error && activeCountryCode && (
          <>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-display text-section-title text-white">
                  {activeFlag && (
                    <span className="mr-2 align-middle text-xl">{activeFlag}</span>
                  )}
                  {activeCountryName || getCountryName(activeCountryCode) || 'Country'}
                </h2>
                <p className="mt-1 text-[13px] text-white/65">
                  Featured voices, new talent, and trending performances from this country.
                </p>
              </div>
              {videos.length > 0 && (
                <p className="text-[12px] text-white/55">
                  Showing {videos.length} performance
                  {videos.length === 1 ? '' : 's'}. Rankings are based on real engagement and
                  talent signals.
                </p>
              )}
            </div>

            {/* Creators grid */}
            {creators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Top Voices
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl-screen:grid-cols-4">
                  {creators.map((c) => (
                    <Link
                      key={c.id}
                      href={`/profile/${c.username}`}
                      className="group flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-[rgba(14,12,14,0.96)] px-3.5 py-3 transition-all hover:border-accent/40 hover:bg-accent/10"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgba(30,24,28,0.9)] text-[14px] font-semibold text-white/80">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.displayName}
                            className="avatar-image h-full w-full"
                          />
                        ) : (
                          c.displayName.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">
                          {c.displayName}
                        </p>
                        <p className="truncate text-[11px] text-white/55">
                          @{c.username}{' '}
                          {c.country && (
                            <span className="ml-1">
                              {getFlagEmoji(c.country)}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/45">
                          {c.videosCount} performance
                          {c.videosCount === 1 ? '' : 's'} · {c.totalVotes} votes
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Performances grid */}
            {videos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Trending Performances
                  </h3>
                </div>
                <div className="grid grid-cols-card-discovery gap-4 md:grid-cols-card-discovery-md laptop:grid-cols-card-discovery-laptop desktop:grid-cols-card-discovery-desktop xl-screen:grid-cols-card-discovery-xl ultrawide:grid-cols-card-discovery-ultrawide 5k:grid-cols-card-discovery-5k">
                  {videos.map((v) => {
                    const creator: VideoCardCreator = {
                      id: v.creator.id,
                      displayName: v.creator.displayName,
                      username: v.creator.username,
                      avatarUrl: v.creator.avatarUrl ?? undefined,
                      country: v.creator.country ?? undefined,
                      verified: v.creator.isVerified,
                      verificationLevel: v.creator.verificationLevel ?? undefined,
                    };
                    const stats: VideoCardStats = {
                      likesCount: v.likesCount,
                      viewsCount: v.viewsCount,
                      commentsCount: v.commentsCount,
                      votesCount: v.votesCount,
                      talentScore: v.talentScore ?? undefined,
                    };
                    return (
                      <VideoCard
                        key={v.id}
                        id={v.id}
                        title={v.title}
                        thumbnailUrl={v.thumbnailUrl ?? undefined}
                        creator={creator}
                        visibility={v.visibility}
                        stats={stats}
                        badge={v.isFeatured ? 'trending' : null}
                        badgeLabel={v.category?.name ?? null}
                        cardSize="discovery"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {creators.length === 0 && videos.length === 0 && (
              <div className="mx-auto max-w-[560px] space-y-4 rounded-[24px] border border-white/[0.08] bg-[rgba(10,8,10,0.96)] p-6 md:p-8 text-center shadow-glass">
                <p className="text-[15px] font-medium text-white/85">
                  No performances yet from this country.
                </p>
                <p className="text-[13px] text-white/65">
                  Be the first to represent this stage and put your country on the global map.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href="/upload"
                    className="inline-flex items-center justify-center rounded-[999px] bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-btn-primary hover:bg-accent-hover transition-colors"
                  >
                    Upload Performance
                  </Link>
                  <Link
                    href="/explore"
                    className="inline-flex items-center justify-center rounded-[999px] border border-white/20 px-5 py-2.5 text-[13px] font-medium text-white/85 hover:bg-white/[0.06] transition-colors"
                  >
                    Browse global talent
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {!activeCountryCode && !loading && !error && (
          <div className="mx-auto max-w-[560px] rounded-[20px] border border-white/[0.08] bg-[rgba(12,10,12,0.96)] p-6 text-center text-[13px] text-white/75">
            Select a country on the map or from the list above to discover its top voices and
            performances.
          </div>
        )}
      </section>
    </div>
  );
}

