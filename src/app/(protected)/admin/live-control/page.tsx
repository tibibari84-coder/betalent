'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type ChallengeOption = {
  id: string;
  slug: string;
  title: string;
};

type SessionState = {
  sessionId: string | null;
  status: string | null;
  slotsCount: number;
};

type ActionType = 'start' | 'next' | 'end';

function actionLabel(action: ActionType): string {
  if (action === 'start') return 'Start session';
  if (action === 'next') return 'Next performer';
  return 'End session';
}

export default function AdminLiveControlPage() {
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState('');

  const [sessionState, setSessionState] = useState<SessionState>({
    sessionId: null,
    status: null,
    slotsCount: 0,
  });
  const [loadingSession, setLoadingSession] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [runningAction, setRunningAction] = useState<ActionType | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedChallenge = useMemo(
    () => challenges.find((c) => c.slug === selectedSlug) ?? null,
    [challenges, selectedSlug]
  );

  const loadChallenges = useCallback(async () => {
    setLoadingChallenges(true);
    setError(null);
    try {
      const res = await fetch('/api/challenges?limit=50');
      const data = await res.json();
      if (!res.ok || !data?.ok || !Array.isArray(data.challenges)) {
        throw new Error(data?.message ?? 'Failed to load challenges');
      }
      const mapped: ChallengeOption[] = data.challenges
        .map((c: { id?: string; slug?: string; title?: string }) => ({
          id: c.id ?? '',
          slug: c.slug ?? '',
          title: c.title ?? c.slug ?? 'Untitled challenge',
        }))
        .filter((c: ChallengeOption) => c.slug.length > 0);
      setChallenges(mapped);
      if (!selectedSlug && mapped.length > 0) {
        setSelectedSlug(mapped[0].slug);
      }
    } catch (e) {
      setChallenges([]);
      setError(e instanceof Error ? e.message : 'Failed to load challenges');
    } finally {
      setLoadingChallenges(false);
    }
  }, [selectedSlug]);

  const loadSessionState = useCallback(
    async (slug: string) => {
      if (!slug) return;
      setLoadingSession(true);
      setError(null);
      try {
        const res = await fetch(`/api/live/challenges/${encodeURIComponent(slug)}/session`);
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.message ?? 'Failed to load session state');
        }
        setSessionState({
          sessionId: data.sessionId ?? null,
          status: data.status ?? null,
          slotsCount: typeof data.slotsCount === 'number' ? data.slotsCount : 0,
        });
      } catch (e) {
        setSessionState({ sessionId: null, status: null, slotsCount: 0 });
        setError(e instanceof Error ? e.message : 'Failed to load session state');
      } finally {
        setLoadingSession(false);
      }
    },
    []
  );

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  useEffect(() => {
    if (!selectedSlug) return;
    setNotice(null);
    loadSessionState(selectedSlug);
  }, [selectedSlug, loadSessionState]);

  const createSession = useCallback(async () => {
    if (!selectedSlug) return;
    setCreatingSession(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/live/challenges/${encodeURIComponent(selectedSlug)}/session`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? 'Failed to create session');
      }
      setNotice(data.created ? 'Live session created.' : 'Existing live session loaded.');
      setSessionState({
        sessionId: data.sessionId ?? null,
        status: data.status ?? null,
        slotsCount: typeof data.slotsCount === 'number' ? data.slotsCount : 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session');
    } finally {
      setCreatingSession(false);
    }
  }, [selectedSlug]);

  const runAction = useCallback(
    async (action: ActionType) => {
      if (!sessionState.sessionId) return;
      setRunningAction(action);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(
          `/api/live/sessions/${encodeURIComponent(sessionState.sessionId)}/admin`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          throw new Error(data?.code ?? data?.message ?? `Failed to ${actionLabel(action).toLowerCase()}`);
        }
        setNotice(`${actionLabel(action)} completed.`);
        await loadSessionState(selectedSlug);
      } catch (e) {
        setError(e instanceof Error ? e.message : `Failed to ${actionLabel(action).toLowerCase()}`);
      } finally {
        setRunningAction(null);
      }
    },
    [loadSessionState, selectedSlug, sessionState.sessionId]
  );

  const isSessionLive = sessionState.status === 'LIVE';
  const isSessionScheduled = sessionState.status === 'SCHEDULED';
  const hasSession = !!sessionState.sessionId;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <header className="mb-6 rounded-2xl border border-white/10 bg-[#141418] p-5">
        <h1 className="text-xl font-semibold text-white">Live Session Admin Control</h1>
        <p className="mt-1 text-sm text-white/60">
          Orchestrates the synchronized show (pre-recorded entries on the stage). This is not a WebRTC/RTMP control
          room. Slots advance automatically when their duration elapses; Start / Next / End remain manual overrides.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-[#141418] p-5">
        <label htmlFor="challenge" className="mb-2 block text-sm font-medium text-white/80">
          Challenge
        </label>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <select
            id="challenge"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            disabled={loadingChallenges || challenges.length === 0}
            className="h-10 rounded-lg border border-white/15 bg-[#0f0f12] px-3 text-sm text-white outline-none"
          >
            {loadingChallenges ? <option>Loading challenges...</option> : null}
            {!loadingChallenges && challenges.length === 0 ? (
              <option>No challenges available</option>
            ) : null}
            {!loadingChallenges &&
              challenges.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.title} ({c.slug})
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => selectedSlug && loadSessionState(selectedSlug)}
            disabled={!selectedSlug || loadingSession}
            className="h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/85 hover:bg-white/5 disabled:opacity-50"
          >
            {loadingSession ? 'Refreshing...' : 'Refresh session state'}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/80">
          <p>
            <span className="text-white/55">Selected:</span>{' '}
            {selectedChallenge ? `${selectedChallenge.title} (${selectedChallenge.slug})` : 'None'}
          </p>
          <p className="mt-1">
            <span className="text-white/55">Session:</span> {sessionState.sessionId ?? 'Not created'}
          </p>
          <p className="mt-1">
            <span className="text-white/55">Status:</span> {sessionState.status ?? 'N/A'}
          </p>
          <p className="mt-1">
            <span className="text-white/55">Slots:</span> {sessionState.slotsCount}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createSession}
            disabled={!selectedSlug || creatingSession}
            className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {creatingSession ? 'Creating...' : hasSession ? 'Ensure session exists' : 'Create session'}
          </button>
          <button
            type="button"
            onClick={() => runAction('start')}
            disabled={!hasSession || !isSessionScheduled || !!runningAction}
            className="h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/90 hover:bg-white/5 disabled:opacity-50"
          >
            {runningAction === 'start' ? 'Starting...' : 'Start live'}
          </button>
          <button
            type="button"
            onClick={() => runAction('next')}
            disabled={!hasSession || !isSessionLive || !!runningAction}
            className="h-10 rounded-lg border border-white/15 px-4 text-sm font-medium text-white/90 hover:bg-white/5 disabled:opacity-50"
          >
            {runningAction === 'next' ? 'Advancing...' : 'Next performer'}
          </button>
          <button
            type="button"
            onClick={() => runAction('end')}
            disabled={!hasSession || !isSessionLive || !!runningAction}
            className="h-10 rounded-lg border border-red-400/30 px-4 text-sm font-medium text-red-200 hover:bg-red-500/10 disabled:opacity-50"
          >
            {runningAction === 'end' ? 'Ending...' : 'End session'}
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </section>
    </main>
  );
}
