'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { getFlagEmoji } from '@/lib/countries';

export type ArenaLeaderboardRow = {
  rank: number;
  creatorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  country: string | null;
  countryFlag: string;
  videoId: string;
  videoTitle: string;
  score: number;
  votesCount?: number;
  averageStars?: number;
  /** From backend finalist phase only — never invented */
  isFinalist?: boolean;
};

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * Single transition finalist → non-finalist in rank order: show cut divider after that row.
 * Multiple or zero transitions: no synthetic cut line (ambiguous or N/A).
 */
export function getFinalistCutAfterIndex(entries: ArenaLeaderboardRow[]): number | null {
  let transitions = 0;
  let idx: number | null = null;
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].isFinalist && !entries[i + 1].isFinalist) {
      transitions += 1;
      idx = i;
    }
  }
  return transitions === 1 ? idx : null;
}

type Props = {
  rows: ArenaLeaderboardRow[];
  /** Highlight row when this matches videoId (logged-in user's entry) */
  highlightVideoId: string | null;
};

function RowAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-9 w-9 md:h-10 md:w-10 rounded-full object-cover ring-1 ring-white/10" />
    );
  }
  const initial = name.trim().charAt(0) || '?';
  return (
    <div
      className="h-9 w-9 md:h-10 md:w-10 rounded-full flex items-center justify-center text-xs font-bold text-white/75 ring-1 ring-white/10"
      style={{ background: 'rgba(196,18,47,0.25)' }}
    >
      {initial.toUpperCase()}
    </div>
  );
}

function rankRowAccent(rank: number): string {
  if (rank === 1) return 'border-l-[3px] border-l-amber-400/55 bg-gradient-to-r from-amber-500/[0.07] to-transparent';
  if (rank === 2) return 'border-l-[3px] border-l-slate-300/35 bg-gradient-to-r from-slate-400/[0.05] to-transparent';
  if (rank === 3) return 'border-l-[3px] border-l-amber-700/40 bg-gradient-to-r from-amber-800/[0.06] to-transparent';
  return '';
}

export function ChallengeArenaLeaderboardTable({ rows, highlightVideoId }: Props) {
  const cutAfter = getFinalistCutAfterIndex(rows);
  const anyFinalist = rows.some((r) => r.isFinalist);

  if (rows.length === 0) {
    return (
      <div
        id="arena-leaderboard"
        className="rounded-[20px] border border-white/[0.08] px-5 py-14 text-center scroll-mt-24"
        style={{ background: 'rgba(22,22,26,0.5)', backdropFilter: 'blur(16px)' }}
      >
        <p className="font-display text-[20px] font-bold text-white mb-2">Leaderboard awaits</p>
        <p className="text-[14px] text-white/55 max-w-lg mx-auto leading-relaxed">
          Rankings appear here as soon as performances are entered. Scores and positions come from live challenge data — nothing is simulated.
        </p>
      </div>
    );
  }

  return (
    <div id="arena-leaderboard" className="scroll-mt-24 space-y-4 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-[20px] md:text-[22px] font-bold text-white tracking-tight">Arena leaderboard</h3>
          <p className="text-[13px] text-white/45 mt-1">Ranked by competition score · community star votes shown where available</p>
        </div>
        <span className="text-[12px] text-white/40 tabular-nums">{rows.length} shown</span>
      </div>

      {anyFinalist && cutAfter === null && (
        <p className="text-[12px] text-white/45 border-l-2 border-accent/40 pl-3">
          Finalist status is shown per entry when set by the challenge phase. There is no single cut line because finalist rows are not contiguous in this ordering.
        </p>
      )}

      {/* Desktop table */}
      <div
        className="hidden md:block rounded-[20px] border overflow-hidden"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(18,18,22,0.65)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <table className="w-full text-left border-collapse min-w-0">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-white/40 border-b border-white/[0.06]">
              <th className="py-3 pl-4 pr-2 font-semibold w-14">#</th>
              <th className="py-3 px-2 font-semibold">Creator</th>
              <th className="py-3 px-2 font-semibold text-right">Score</th>
              <th className="py-3 pr-4 pl-2 font-semibold text-right">Votes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={r.videoId}>
                <tr
                  className={`border-b border-white/[0.04] transition-colors duration-200 hover:bg-white/[0.04] ${rankRowAccent(r.rank)} ${
                    highlightVideoId === r.videoId ? 'bg-accent/[0.07]' : ''
                  }`}
                >
                  <td className="py-3 pl-4 pr-2 align-middle">
                    <span className="font-display text-[15px] font-bold text-white tabular-nums">{r.rank}</span>
                  </td>
                  <td className="py-3 px-2 align-middle min-w-0">
                    <Link
                      href={`/video/${encodeURIComponent(r.videoId)}`}
                      className="flex items-center gap-3 min-w-0 group"
                    >
                      <RowAvatar url={r.avatarUrl} name={r.displayName} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[14px] text-white truncate group-hover:text-accent transition-colors">
                            {r.displayName}
                          </span>
                          {r.isFinalist ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25 shrink-0">
                              Finalist
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-white/45 truncate">
                          <span>@{r.username}</span>
                          {(r.countryFlag || r.country) && (
                            <span className="shrink-0">{r.countryFlag || getFlagEmoji(r.country)}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-2 align-middle text-right">
                    <span className="font-display text-[15px] font-bold text-white tabular-nums">{formatScore(r.score)}</span>
                  </td>
                  <td className="py-3 pr-4 pl-2 align-middle text-right">
                    <span className="text-[13px] text-white/65 tabular-nums">
                      {typeof r.votesCount === 'number' ? r.votesCount : '—'}
                      {typeof r.averageStars === 'number' && r.averageStars > 0 && (
                        <span className="text-white/40"> · ★{r.averageStars.toFixed(1)}</span>
                      )}
                    </span>
                  </td>
                </tr>
                {cutAfter !== null && i === cutAfter ? (
                  <tr key={`cut-${r.videoId}`} className="bg-transparent">
                    <td colSpan={4} className="py-2 px-4">
                      <div
                        className="flex items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-amber-400/90 font-bold"
                        role="separator"
                      >
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                        <span>Qualification cut</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((r, i) => (
          <div key={r.videoId}>
            <Link
              href={`/video/${encodeURIComponent(r.videoId)}`}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors duration-200 active:bg-white/[0.04] ${rankRowAccent(r.rank)} ${
                highlightVideoId === r.videoId ? 'border-accent/35 bg-accent/[0.06]' : 'border-white/[0.08] bg-white/[0.02]'
              }`}
            >
              <span className="font-display text-lg font-bold text-white w-8 tabular-nums shrink-0">{r.rank}</span>
              <RowAvatar url={r.avatarUrl} name={r.displayName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] text-white truncate">{r.displayName}</span>
                  {r.isFinalist ? (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 shrink-0">
                      Final
                    </span>
                  ) : null}
                </div>
                <p className="text-[12px] text-white/45 truncate">{r.videoTitle}</p>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-white/50">
                  <span className="font-mono tabular-nums text-white/80">{formatScore(r.score)}</span>
                  {typeof r.votesCount === 'number' && <span>{r.votesCount} votes</span>}
                </div>
              </div>
              <span className="text-lg shrink-0" aria-hidden>
                {(r.countryFlag || r.country) && (r.countryFlag || getFlagEmoji(r.country))}
              </span>
            </Link>
            {cutAfter !== null && i === cutAfter ? (
              <div className="flex items-center gap-2 py-2 text-[10px] uppercase tracking-widest text-amber-400/90 font-bold px-1">
                <div className="flex-1 h-px bg-amber-500/30" />
                Qualification cut
                <div className="flex-1 h-px bg-amber-500/30" />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-[12px] text-white/35 text-center md:text-left">
        Switch back to this tab or refresh the page to load the latest ranks after you vote.
      </p>
    </div>
  );
}
