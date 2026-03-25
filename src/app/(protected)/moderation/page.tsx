'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  MODERATION_QUEUE_TYPES,
  MODERATION_QUEUE_LABELS,
  CONTENT_REPORT_TYPE_LABELS,
  type ModerationQueueType,
} from '@/constants/moderation';
import { IconShieldCheck, IconSearch } from '@/components/ui/Icons';

type QueueItem = Record<string, unknown>;
type Detail = Record<string, unknown> | null;

export default function ModerationPage() {
  const router = useRouter();
  const [queueType, setQueueType] = useState<ModerationQueueType>('reported_videos');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Detail>(null);
  const [detailTargetType, setDetailTargetType] = useState<string | null>(null);
  const [detailTargetId, setDetailTargetId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [search, setSearch] = useState('');
  const [moderationStatus, setModerationStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [integrityStatus, setIntegrityStatus] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'queues' | 'audit'>('queues');
  const [logEntries, setLogEntries] = useState<Array<{ id: string; moderatorUsername: string; targetType: string; targetId: string; actionType: string; previousStatus: string | null; newStatus: string | null; note: string | null; createdAt: string }>>([]);
  const [logNextCursor, setLogNextCursor] = useState<string | null>(null);
  const [logLoading, setLogLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logTargetType, setLogTargetType] = useState('');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo] = useState('');

  const [reportType, setReportType] = useState('');

  const fetchQueue = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ queueType, limit: '20' });
        if (cursor) params.set('cursor', cursor);
        if (search) params.set('search', search);
        if (moderationStatus) params.set('moderationStatus', moderationStatus);
        if (reportType) params.set('reportType', reportType);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (riskLevel) params.set('riskLevel', riskLevel);
        if (integrityStatus) params.set('integrityStatus', integrityStatus);
        const res = await fetch(`/api/moderation/queues?${params}`);
        const data = await res.json();
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          router.replace('/');
          return;
        }
        if (!res.ok) throw new Error(data.message ?? 'Failed to load');
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
      } catch {
        setItems([]);
        setNextCursor(null);
      } finally {
        setAuthResolved(true);
        setLoading(false);
      }
    },
    [queueType, search, moderationStatus, reportType, dateFrom, dateTo, riskLevel, integrityStatus, router]
  );

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const fetchLogs = useCallback(
    async (cursor?: string) => {
      setLogLoading(true);
      try {
        const params = new URLSearchParams({ limit: '25' });
        if (cursor) params.set('cursor', cursor);
        if (logSearch.trim()) params.set('search', logSearch.trim());
        if (logTargetType) params.set('targetType', logTargetType);
        if (logDateFrom) params.set('dateFrom', logDateFrom);
        if (logDateTo) params.set('dateTo', logDateTo);
        const res = await fetch(`/api/moderation/logs?${params}`);
        const data = await res.json();
        if (res.status === 403) {
          setLogEntries([]);
          setLogNextCursor(null);
          return;
        }
        if (!res.ok) throw new Error(data.message ?? 'Failed to load');
        const entries = data.entries ?? [];
        setLogEntries(cursor ? (prev) => [...prev, ...entries] : entries);
        setLogNextCursor(data.nextCursor ?? null);
      } catch {
        setLogEntries([]);
        setLogNextCursor(null);
      } finally {
        setLogLoading(false);
      }
    },
    [logSearch, logTargetType, logDateFrom, logDateTo]
  );

  useEffect(() => {
    if (viewMode === 'audit') fetchLogs();
  }, [viewMode, fetchLogs]);

  const openDetail = useCallback(
    (targetType: string, targetId: string) => {
      setDetailTargetType(targetType);
      setDetailTargetId(targetId);
      setDetail(null);
      setDetailLoading(true);
    },
    []
  );

  useEffect(() => {
    if (!detailTargetType || !detailTargetId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(
      `/api/moderation/detail?targetType=${encodeURIComponent(detailTargetType)}&targetId=${encodeURIComponent(detailTargetId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setDetail(data.detail ?? null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailTargetType, detailTargetId]);

  const performAction = useCallback(
    async (
      actionType: string,
      newStatus?: string,
      noteOverride?: string,
      overrideTargetType?: string,
      overrideTargetId?: string
    ) => {
      const targetType = overrideTargetType ?? detailTargetType;
      const targetId = overrideTargetId ?? detailTargetId;
      if (!targetType || !targetId) return;
      setActionLoading(true);
      const note = noteOverride ?? actionNote;
      try {
        const res = await fetch('/api/moderation/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType,
            targetId,
            actionType,
            newStatus: newStatus ?? undefined,
            note: note || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Action failed');
        setActionNote('');
        if (detail && !overrideTargetType) {
          const d = detail as Record<string, unknown>;
          if (detailTargetType === 'CHALLENGE_ENTRY') {
            const fairnessStatus =
              actionType === 'EXCLUDE_ENTRY_SUPPORT' ? 'SUPPORT_EXCLUDED'
              : actionType === 'FREEZE_ENTRY' ? 'FROZEN'
              : actionType === 'DISQUALIFY_ENTRY' ? 'DISQUALIFIED'
              : (actionType === 'RESTORE_ENTRY' ? 'CLEAN' : d.fairnessStatus);
            setDetail({ ...detail, fairnessStatus });
          } else if (detailTargetType === 'CREATOR_VERIFICATION' && (actionType === 'APPROVE_VERIFICATION' || actionType === 'REJECT_VERIFICATION' || actionType === 'REVOKE_VERIFICATION')) {
            setDetail({ ...detail, verificationStatus: newStatus ?? (actionType === 'APPROVE_VERIFICATION' ? 'APPROVED' : actionType === 'REJECT_VERIFICATION' ? 'REJECTED' : 'REVOKED'), verificationLevel: newStatus && ['IDENTITY_VERIFIED', 'TRUSTED_PERFORMER', 'OFFICIAL_ARTIST'].includes(newStatus) ? newStatus : d.verificationLevel });
          } else if (detailTargetType === 'VIDEO') {
            if (actionType === 'CLEAR_VIDEO_FLAGS') {
              setDetail({ ...detail, reportCount: 0, isFlagged: false, moderationStatus: 'APPROVED', contentReports: [] });
            } else if (actionType === 'BLOCK_VIDEO' || actionType === 'DELETE_VIDEO') {
              setDetail({ ...detail, moderationStatus: 'BLOCKED', status: 'HIDDEN', reportCount: 0, isFlagged: false, contentReports: [] });
            } else {
              setDetail({ ...detail, moderationStatus: newStatus ?? d.moderationStatus, status: newStatus ?? d.status });
            }
          } else {
            setDetail({ ...detail, moderationStatus: newStatus ?? d.moderationStatus, status: newStatus ?? d.status });
          }
        }
        fetchQueue();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Action failed');
      } finally {
        setActionLoading(false);
      }
    },
    [detailTargetType, detailTargetId, detail, actionNote, fetchQueue]
  );

  const addNote = useCallback(async () => {
    if (!detailTargetType || !detailTargetId || !actionNote.trim()) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/moderation/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: detailTargetType,
          targetId: detailTargetId,
          note: actionNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to add note');
      setActionNote('');
      if (detail && Array.isArray((detail as Record<string, unknown>).notes)) {
        setDetail({
          ...detail,
          notes: [
            { note: actionNote.trim(), createdAt: new Date().toISOString(), moderatorUsername: 'You' },
            ...((detail as Record<string, unknown>).notes as unknown[]),
          ],
        });
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed');
    } finally {
      setActionLoading(false);
    }
  }, [detailTargetType, detailTargetId, detail, actionNote]);

  const getRowTarget = (item: QueueItem): { type: string; id: string } => {
    if (queueType === 'verification_requests' && item.id) return { type: 'CREATOR_VERIFICATION', id: item.id as string };
    if (queueType === 'challenge_fairness' && item.entryId) return { type: 'CHALLENGE_ENTRY', id: item.entryId as string };
    if (queueType === 'recent_reports' && item.videoId) return { type: 'VIDEO', id: item.videoId as string };
    if (item.videoId) return { type: 'VIDEO', id: item.videoId as string };
    if (item.userId) return { type: 'USER', id: item.userId as string };
    if (item.flagId) return { type: 'SUPPORT_FLAG', id: item.flagId as string };
    if (item.entryId) return { type: 'VIDEO', id: item.videoId as string };
    return { type: 'VIDEO', id: (item.id as string) ?? '' };
  };

  if (!authResolved) {
    return null;
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-6 pb-24" style={{ backgroundColor: '#0D0D0E' }}>
      <header className="mb-6 md:mb-8">
        <h1 className="font-display text-[28px] md:text-[36px] font-bold text-text-primary mb-1 flex items-center gap-2">
          <IconShieldCheck className="w-8 h-8 text-accent" />
          Moderation
        </h1>
        <p className="text-[15px] text-text-secondary">Review queues, inspect items, and take actions. All actions are logged.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <section className="flex-1 min-w-0 rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="p-4 border-b border-white/10 flex flex-wrap items-center gap-3">
            {MODERATION_QUEUE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => { setViewMode('queues'); setQueueType(t); }}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  viewMode === 'queues' && queueType === t
                    ? 'bg-accent/25 text-white border border-accent/40'
                    : 'text-text-secondary hover:bg-white/5 border border-transparent'
                }`}
              >
                {MODERATION_QUEUE_LABELS[t]}
              </button>
            ))}
            <button
              onClick={() => setViewMode('audit')}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                viewMode === 'audit'
                  ? 'bg-accent/25 text-white border border-accent/40'
                  : 'text-text-secondary hover:bg-white/5 border border-transparent'
              }`}
            >
              Audit log
            </button>
          </div>
          {viewMode === 'audit' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Every moderation action is tracked: video approved/flagged, support voided, challenge entry blocked, account suspended, payout frozen, and more. Search by moderator or target ID; filter by target type and date. Add notes in each review panel.
            </p>
          )}
          {viewMode === 'queues' && queueType === 'suspicious_videos' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Videos flagged for AI voice suspicion, duplicate or stolen content, low-quality spam, or challenge rule violations. Review integrity scores and take action.
            </p>
          )}
          {viewMode === 'queues' && queueType === 'suspicious_support' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Suspicious super votes, gifts, coin abuse, support loops, or multi-account manipulation. Review sender, receiver, amount, risk score, and challenge impact—then mark valid, exclude, void, escalate, or restrict.
            </p>
          )}
          {viewMode === 'queues' && queueType === 'suspicious_accounts' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Account Risk Review: accounts with elevated risk score, linked device/account signals, or suspicious support patterns. Review risk details and notes, then watchlist, warn, restrict, suspend, ban, or clear risk if false positive.
            </p>
          )}
          {viewMode === 'queues' && queueType === 'challenge_fairness' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Challenge Fairness Review: suspicious support spikes, ranking jumps, duplicate or low-integrity entries, linked-account manipulation. Review challenge, creator, entry, suspicious support metrics, fairness flags, and recommendation—then exclude support, freeze, disqualify, restore, or approve.
            </p>
          )}
          {viewMode === 'queues' && (queueType === 'reported_videos' || queueType === 'flagged_videos') && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Videos reported by users or flagged for review. Fake performance, copyright, inappropriate content. Review and take action.
            </p>
          )}
          {viewMode === 'queues' && queueType === 'recent_reports' && (
            <p className="px-4 pt-1 pb-0 text-[13px] text-text-muted">
              Newest reports first. Reporter, target video, report type. Click to open video review.
            </p>
          )}
          {viewMode === 'queues' && (
          <div className="p-4 border-b border-white/10 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search username, title, challenge, id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchQueue()}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <select
              value={moderationStatus}
              onChange={(e) => setModerationStatus(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {queueType === 'verification_requests' ? (
                <>
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="REVOKED">Revoked</option>
                </>
              ) : (
                <>
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="FLAGGED">Flagged</option>
                  <option value="APPROVED">Approved</option>
                  <option value="BLOCKED">Blocked</option>
                </>
              )}
            </select>
            {(queueType === 'reported_videos' || queueType === 'recent_reports') && (
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">All report types</option>
                <option value="FAKE_PERFORMANCE">Fake performance</option>
                <option value="COPYRIGHT">Copyright</option>
                <option value="INAPPROPRIATE">Inappropriate</option>
                <option value="OTHER">Other</option>
              </select>
            )}
            {(queueType === 'suspicious_videos' || queueType === 'ai_integrity' || queueType === 'duplicate_media') && (
              <select
                value={integrityStatus}
                onChange={(e) => setIntegrityStatus(e.target.value)}
                className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">All integrity</option>
                <option value="CLEAN">Clean</option>
                <option value="SUSPECTED_DUPLICATE">Suspected duplicate</option>
                <option value="SUSPECTED_STOLEN">Suspected stolen</option>
                <option value="REVIEW_REQUIRED">Review required</option>
              </select>
            )}
            {queueType === 'suspicious_accounts' && (
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">All risk</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            )}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              title="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
              title="To date"
            />
            <button
              onClick={() => fetchQueue()}
              className="h-10 px-4 rounded-lg bg-accent/20 text-accent font-medium text-[14px] hover:bg-accent/30 transition-colors"
            >
              Apply
            </button>
          </div>
          )}
          {viewMode === 'audit' && (
          <div className="p-4 border-b border-white/10 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Moderator or target ID..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <select
              value={logTargetType}
              onChange={(e) => setLogTargetType(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="">All targets</option>
              <option value="VIDEO">Video</option>
              <option value="USER">User</option>
              <option value="SUPPORT_FLAG">Support flag</option>
              <option value="CHALLENGE_ENTRY">Challenge entry</option>
              <option value="CREATOR_VERIFICATION">Verification</option>
              <option value="CONTENT_REPORT">Content report</option>
            </select>
            <input
              type="date"
              value={logDateFrom}
              onChange={(e) => setLogDateFrom(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <input
              type="date"
              value={logDateTo}
              onChange={(e) => setLogDateTo(e.target.value)}
              className="h-10 px-3 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={() => fetchLogs()}
              className="h-10 px-4 rounded-lg bg-accent/20 text-accent font-medium text-[14px] hover:bg-accent/30 transition-colors"
            >
              Search
            </button>
          </div>
          )}
          <div className="min-h-[320px]">
            {viewMode === 'audit' ? (
              logLoading && logEntries.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-[14px]">Loading audit log…</div>
              ) : logEntries.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-[14px]">No moderation actions found. Use filters or search to find history.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-b border-white/10 text-text-muted font-medium">
                          <th className="py-2.5 px-3">Moderator</th>
                          <th className="py-2.5 px-3">Target</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Old → New</th>
                          <th className="py-2.5 px-3">Time</th>
                          <th className="py-2.5 px-3">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                            <td className="py-2 px-3 text-text-primary">{entry.moderatorUsername}</td>
                            <td className="py-2 px-3 text-text-secondary">{entry.targetType} · {entry.targetId.length > 10 ? `${entry.targetId.slice(0, 10)}…` : entry.targetId}</td>
                            <td className="py-2 px-3 text-text-primary">{entry.actionType.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-3 text-text-secondary">
                              {entry.previousStatus ?? '—'} → {entry.newStatus ?? '—'}
                            </td>
                            <td className="py-2 px-3 text-white/50 whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 text-text-muted max-w-[160px] truncate" title={entry.note ?? undefined}>{entry.note ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {logNextCursor && !logLoading && (
                    <div className="p-4 border-t border-white/10 text-center">
                      <button
                        type="button"
                        onClick={() => fetchLogs(logNextCursor)}
                        className="text-[14px] text-accent hover:underline"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )
            ) : loading ? (
              <div className="p-8 text-center text-text-muted text-[14px]">Loading queue…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-[14px]">
                {queueType === 'reported_videos' && 'No reported videos to review.'}
                {queueType === 'flagged_videos' && 'No flagged videos to review.'}
                {queueType === 'recent_reports' && 'No recent reports.'}
                {queueType === 'suspicious_videos' && 'No suspicious videos to review.'}
                {queueType === 'suspicious_support' && 'No suspicious support to review.'}
                {queueType === 'suspicious_accounts' && 'No suspicious accounts to review.'}
                {queueType === 'challenge_fairness' && 'No challenge fairness items to review.'}
                {!['reported_videos', 'flagged_videos', 'recent_reports', 'suspicious_videos', 'suspicious_support', 'suspicious_accounts', 'challenge_fairness'].includes(queueType) && 'No items in this queue.'}
              </div>
            ) : (
              <ul className="divide-y divide-white/10">
                {items.map((item) => {
                  const { type, id } = getRowTarget(item);
                  if ((queueType === 'reported_videos' || queueType === 'flagged_videos') && item.videoId) {
                    const uploadDate = item.uploadDate ? new Date(item.uploadDate as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    const reasons = (item.reportReasons as string[]) ?? [];
                    return (
                      <li key={`VIDEO-${item.videoId}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('VIDEO', item.videoId as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          {item.thumbnailUrl ? (
                            <img src={String(item.thumbnailUrl)} alt="" className="w-14 h-14 rounded-lg object-cover bg-white/5 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">No thumb</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{String(item.title ?? item.videoId)}</p>
                            <p className="text-[13px] text-text-muted truncate">
                              {String(item.creatorDisplayName ?? item.creatorUsername ?? '')}
                              {uploadDate ? ` · ${uploadDate}` : ''}
                            </p>
                            {reasons.length > 0 && (
                              <p className="text-[12px] text-amber-400/90 truncate mt-0.5">
                                {reasons.map((r) => CONTENT_REPORT_TYPE_LABELS[r] ?? r).join(' · ')}
                              </p>
                            )}
                            <p className="text-[11px] text-white/50 mt-0.5">
                              {Number(item.reportCount ?? 0)} report{(item.reportCount as number) !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary shrink-0">
                            {String(item.moderationStatus ?? 'PENDING')}
                          </span>
                        </button>
                      </li>
                    );
                  }
                  if (queueType === 'recent_reports' && item.videoId) {
                    const ts = item.createdAt ? new Date(item.createdAt as string).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <li key={`report-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('VIDEO', item.videoId as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">
                            {CONTENT_REPORT_TYPE_LABELS[item.reportType as string] ?? item.reportType}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">
                              @{String(item.reporterUsername)} → {String(item.videoTitle)}
                            </p>
                            <p className="text-[13px] text-text-muted truncate">
                              {CONTENT_REPORT_TYPE_LABELS[item.reportType as string] ?? item.reportType}
                              {ts ? ` · ${ts}` : ''}
                            </p>
                            {item.details != null && item.details !== '' ? (
                              <p className="text-[12px] text-white/50 truncate mt-0.5">{String(item.details)}</p>
                            ) : null}
                          </div>
                          <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary shrink-0">
                            {String(item.status)}
                          </span>
                        </button>
                      </li>
                    );
                  }
                  if ((queueType === 'suspicious_videos' || queueType === 'ai_integrity' || queueType === 'duplicate_media') && item.videoId) {
                    const uploadDate = item.uploadDate ? new Date(item.uploadDate as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    const scores: string[] = [];
                    if (item.aiVoiceRiskScore != null || item.aiVoiceSuspicionScore != null) scores.push(`AI: ${Math.round(Number(item.aiVoiceRiskScore ?? item.aiVoiceSuspicionScore))}`);
                    if (item.duplicateRiskScore != null) scores.push(`Dup: ${Math.round(Number(item.duplicateRiskScore))}`);
                    if (item.lipSyncRiskScore != null) scores.push(`Lip: ${Math.round(Number(item.lipSyncRiskScore))}`);
                    const comparisonCount = (item.comparisonCandidateIds as string[] | undefined)?.length ?? 0;
                    return (
                      <li key={`${type}-${id}`}>
                        <button
                          type="button"
                          onClick={() => openDetail(type, id)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={String(item.thumbnailUrl)}
                              alt=""
                              className="w-14 h-14 rounded-lg object-cover bg-white/5 shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">No thumb</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{String(item.title ?? item.videoId)}</p>
                            <p className="text-[13px] text-text-muted truncate">
                              {String(item.creatorDisplayName ?? item.creatorUsername ?? '')}
                              {item.styleCategorySlug ? ` · ${String(item.styleCategorySlug)}` : ''}
                              {uploadDate ? ` · ${uploadDate}` : ''}
                            </p>
                            {item.flagReason ? (
                              <p className="text-[12px] text-amber-400/90 truncate mt-0.5">Flag: {String(item.flagReason)}</p>
                            ) : null}
                            {scores.length > 0 ? (
                              <p className="text-[11px] text-white/50 mt-0.5">{scores.join(' · ')}{comparisonCount > 0 ? ` · ${comparisonCount} similar` : ''}</p>
                            ) : comparisonCount > 0 ? (
                              <p className="text-[11px] text-white/50 mt-0.5">{comparisonCount} similar</p>
                            ) : null}
                          </div>
                          {(item.moderationStatus ?? item.status ?? item.riskLevel ?? item.originalityStatus) ? (
                            <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary shrink-0">
                              {String(item.moderationStatus ?? item.status ?? item.riskLevel ?? item.originalityStatus)}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  }
                  if (queueType === 'suspicious_support' && item.flagId) {
                    const ts = item.timestamp ? new Date(item.timestamp as string).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                    const challengeImpact = item.challengeImpact as { inChallenge: boolean; challengeSlug?: string; challengeTitle?: string } | null;
                    return (
                      <li key={`SUPPORT_FLAG-${item.flagId}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('SUPPORT_FLAG', item.flagId as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">
                            {item.supportType === 'GIFT' ? 'Gift' : 'Vote'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">
                              {String(item.senderDisplayName ?? item.senderUsername)} → {String(item.receiverDisplayName ?? item.receiverUsername)}
                            </p>
                            <p className="text-[13px] text-text-muted truncate">
                              {String(item.supportType)} · {Number(item.amount)} coins
                              {ts ? ` · ${ts}` : ''}
                            </p>
                            {item.reasonFlagged ? (
                              <p className="text-[12px] text-amber-400/90 truncate mt-0.5">Reason: {String(item.reasonFlagged)}</p>
                            ) : null}
                            {challengeImpact?.inChallenge && challengeImpact.challengeTitle ? (
                              <p className="text-[11px] text-white/50 mt-0.5">Challenge: {String(challengeImpact.challengeTitle)}</p>
                            ) : null}
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-0.5">
                            {item.fraudRiskScore != null && Number(item.fraudRiskScore) > 0 ? (
                              <span className="text-[12px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">Risk {String(item.fraudRiskScore)}</span>
                            ) : null}
                            <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary">{String(item.status)}</span>
                          </div>
                        </button>
                      </li>
                    );
                  }
                  if (queueType === 'suspicious_accounts' && item.userId) {
                    return (
                      <li key={`USER-${item.userId}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('USER', item.userId as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">
                            @
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{String(item.displayName ?? item.username)}</p>
                            <p className="text-[13px] text-text-muted truncate">@{String(item.username)}</p>
                            <p className="text-[12px] text-white/50 mt-0.5">
                              {Number(item.accountAgeDays)} days · Risk {String(item.fraudRiskScore)} · Linked: {String(item.linkedAccountCount)} · Suspicious support: {String(item.suspiciousSupportCount)}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-0.5">
                            {(item.riskLevel as string) && (
                              <span className="text-[12px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">{String(item.riskLevel)}</span>
                            )}
                            <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary">
                              {String(item.moderationStatus ?? '—')}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  }
                  if (queueType === 'challenge_fairness' && item.entryId) {
                    const flags = (item.fairnessFlags as string[]) ?? [];
                    return (
                      <li key={`CHALLENGE_ENTRY-${item.entryId}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('CHALLENGE_ENTRY', item.entryId as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[11px]">
                            Entry
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{String(item.challengeTitle)}</p>
                            <p className="text-[13px] text-text-muted truncate">
                              {String(item.creatorDisplayName ?? item.creatorUsername)} · {String(item.videoTitle ?? 'Video')}
                            </p>
                            <p className="text-[12px] text-white/50 mt-0.5">
                              Suspicious support: {Number(item.suspiciousSupportCount)} · {item.integrityFlagged ? 'Integrity flagged' : 'OK'}
                            </p>
                            {flags.length > 0 ? (
                              <p className="text-[11px] text-amber-400/90 mt-0.5">{flags.join(' · ')}</p>
                            ) : null}
                            <p className="text-[11px] text-text-muted mt-0.5">Recommendation: {String(item.recommendation)}</p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-0.5">
                            {(item.fairnessStatus as string) && (
                              <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary">{String(item.fairnessStatus)}</span>
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  }
                  if (queueType === 'verification_requests' && item.id) {
                    const created = item.createdAt ? new Date(item.createdAt as string).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    return (
                      <li key={`CREATOR_VERIFICATION-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => openDetail('CREATOR_VERIFICATION', item.id as string)}
                          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                        >
                          {item.avatarUrl ? (
                            <img src={String(item.avatarUrl)} alt="" className="avatar-image w-14 h-14 rounded-full bg-white/5 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-white/5 shrink-0 flex items-center justify-center text-text-muted text-[13px] font-medium">
                              {(item.displayName as string)?.charAt(0) ?? '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-text-primary truncate">{String(item.displayName ?? item.username)}</p>
                            <p className="text-[13px] text-text-muted truncate">@{String(item.username)}</p>
                            <p className="text-[12px] text-white/50 mt-0.5">
                              {String(item.verificationLevel)} · {created ? `Requested ${created}` : ''}
                            </p>
                          </div>
                          <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary shrink-0">
                            {String(item.verificationStatus ?? 'PENDING')}
                          </span>
                        </button>
                      </li>
                    );
                  }
                  const label =
                    (item.title as string) ||
                    (item.username as string) ||
                    (item.challengeTitle as string) ||
                    (item.id as string);
                  const sub =
                    (item.creatorUsername as string) ||
                    (item.senderUsername as string) ||
                    (item.moderationStatus as string) ||
                    '';
                  return (
                    <li key={`${type}-${id}`}>
                      <button
                        type="button"
                        onClick={() => openDetail(type, id)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                      >
                        {item.thumbnailUrl ? (
                          <img
                            src={String(item.thumbnailUrl)}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover bg-white/5"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">{label}</p>
                          {sub ? <p className="text-[13px] text-text-muted truncate">{sub}</p> : null}
                        </div>
                        {(item.moderationStatus ?? item.status ?? item.riskLevel) ? (
                          <span className="text-[12px] px-2 py-0.5 rounded bg-white/10 text-text-secondary shrink-0">
                            {String(item.moderationStatus ?? item.status ?? item.riskLevel)}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {nextCursor && !loading && (
              <div className="p-4 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => fetchQueue(nextCursor)}
                  className="text-[14px] text-accent hover:underline"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </section>

        {detailTargetId && (
          <aside className="w-full lg:w-[380px] shrink-0 rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden flex flex-col max-h-[70vh] lg:max-h-[calc(100vh-200px)]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-display font-semibold text-text-primary">
                {detailTargetType === 'VIDEO' && 'Video review'}
                {detailTargetType === 'SUPPORT_FLAG' && 'Support review'}
                {detailTargetType === 'USER' && 'Account review'}
                {detailTargetType === 'CHALLENGE_ENTRY' && 'Challenge fairness'}
                {detailTargetType === 'CREATOR_VERIFICATION' && 'Verification review'}
                {detailTargetType !== 'VIDEO' && detailTargetType !== 'SUPPORT_FLAG' && detailTargetType !== 'USER' && detailTargetType !== 'CHALLENGE_ENTRY' && detailTargetType !== 'CREATOR_VERIFICATION' && 'Review'}
              </h3>
              <button
                type="button"
                onClick={() => { setDetailTargetId(null); setDetail(null); }}
                className="text-text-muted hover:text-text-primary text-[14px]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailLoading ? (
                <p className="text-[14px] text-text-muted">Loading…</p>
              ) : detail ? (
                <>
                  {detailTargetType === 'VIDEO' ? (
                    <>
                      {detail.thumbnailUrl ? (
                        <a
                          href={detail.videoUrl ? `/video/${detail.videoId}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block relative w-full aspect-video rounded-lg overflow-hidden bg-white/5"
                        >
                          <img
                            src={String(detail.thumbnailUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {detail.videoUrl ? (
                            <span className="absolute bottom-2 right-2 text-[11px] px-2 py-1 rounded bg-black/60 text-white">View video →</span>
                          ) : null}
                        </a>
                      ) : null}
                      <div>
                        <p className="font-medium text-text-primary text-[15px]">{String(detail.title ?? '')}</p>
                        <p className="text-[13px] text-text-muted mt-0.5">
                          {String(detail.creatorDisplayName ?? detail.creatorUsername ?? '')} · {String(detail.styleCategorySlug ?? '')}
                        </p>
                        <p className="text-[12px] text-white/50 mt-0.5">
                          Uploaded {detail.uploadDate ? new Date(String(detail.uploadDate)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      {Array.isArray(detail.contentReports) && (detail.contentReports as unknown[]).length > 0 && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-[12px] font-medium text-amber-400/90 uppercase tracking-wide">Content reports ({String(detail.reportCount ?? (detail.contentReports as unknown[]).length)})</p>
                          <ul className="mt-2 space-y-2">
                            {(detail.contentReports as Array<{ reportType: string; details: string | null; reporterUsername: string; createdAt: string }>).map((r, i) => (
                              <li key={i} className="text-[13px] text-text-primary">
                                <span className="font-medium">{CONTENT_REPORT_TYPE_LABELS[r.reportType] ?? r.reportType}</span>
                                {r.details && <span className="text-text-secondary"> — {r.details}</span>}
                                <span className="text-white/50 text-[12px]"> · @{r.reporterUsername}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detail.flagReason ? (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-[12px] font-medium text-amber-400/90 uppercase tracking-wide">Integrity flag</p>
                          <p className="text-[14px] text-text-primary mt-1">{String(detail.flagReason)}</p>
                        </div>
                      ) : null}
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Integrity scores</p>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                          {detail.aiVoiceRiskScore != null && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">AI voice risk</span>
                              <span className="text-text-primary">{Math.round(Number(detail.aiVoiceRiskScore))}</span>
                            </div>
                          )}
                          {detail.duplicateRiskScore != null && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">Duplicate risk</span>
                              <span className="text-text-primary">{Math.round(Number(detail.duplicateRiskScore))}</span>
                            </div>
                          )}
                          {detail.lipSyncRiskScore != null && (
                            <div className="flex justify-between">
                              <span className="text-text-muted">Lip-sync risk</span>
                              <span className="text-text-primary">{Math.round(Number(detail.lipSyncRiskScore))}</span>
                            </div>
                          )}
                          {detail.aiVoiceRiskLevel ? (
                            <div className="flex justify-between col-span-2">
                              <span className="text-text-muted">AI risk level</span>
                              <span className="text-text-primary">{String(detail.aiVoiceRiskLevel)}</span>
                            </div>
                          ) : null}
                          {detail.integrityStatus ? (
                            <div className="flex justify-between col-span-2">
                              <span className="text-text-muted">Originality</span>
                              <span className="text-text-primary">{String(detail.integrityStatus)}</span>
                            </div>
                          ) : null}
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Moderation</span>
                            <span className="text-text-primary">{String(detail.moderationStatus ?? 'PENDING')}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : detailTargetType === 'USER' ? (
                    <>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p className="text-[15px] font-medium text-text-primary">{String(detail.displayName ?? detail.username)}</p>
                        <p className="text-[13px] text-text-muted">@{String(detail.username ?? '')}</p>
                        <p className="text-[12px] text-white/50 mt-1">
                          Account age: {Number(detail.accountAgeDays ?? 0)} days
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Risk</p>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                          <div className="flex justify-between">
                            <span className="text-text-muted">Risk score</span>
                            <span className="text-text-primary">{Number(detail.fraudRiskScore ?? 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-text-muted">Risk level</span>
                            <span className="text-text-primary">{String(detail.riskLevel ?? '—')}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Linked account risk</span>
                            <span className="text-text-primary">{Number(detail.linkedAccountCount ?? 0)}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Suspicious support count</span>
                            <span className="text-text-primary">{Number(detail.suspiciousSupportCount ?? 0)}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Payout blocked</span>
                            <span className="text-text-primary">{detail.payoutBlocked ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Current status</span>
                            <span className="text-text-primary">{String(detail.moderationStatus ?? '—')}</span>
                          </div>
                        </div>
                      </div>
                      {Array.isArray((detail as Record<string, unknown>).notes) &&
                        ((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).length > 0 && (
                          <div>
                            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Moderation notes</p>
                            <ul className="space-y-2">
                              {((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).map((n, i) => (
                                <li key={i} className="text-[13px] text-text-secondary bg-white/5 rounded-lg p-2">
                                  {n.note} — {n.moderatorUsername} · {new Date(n.createdAt).toLocaleString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </>
                  ) : detailTargetType === 'SUPPORT_FLAG' ? (
                    <>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 space-y-2">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide">Support</p>
                        <p className="text-[15px] text-text-primary">
                          {String(detail.senderDisplayName ?? detail.senderUsername)} → {String(detail.receiverDisplayName ?? detail.receiverUsername)}
                        </p>
                        <p className="text-[13px] text-text-secondary">
                          {String(detail.supportType ?? '')} · {Number(detail.amount ?? 0)} coins
                        </p>
                        <p className="text-[12px] text-white/50">
                          {detail.timestamp ? new Date(String(detail.timestamp)).toLocaleString() : '—'}
                        </p>
                      </div>
                      {detail.reasonFlagged ? (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-[12px] font-medium text-amber-400/90 uppercase tracking-wide">Reason flagged</p>
                          <p className="text-[14px] text-text-primary mt-1">{String(detail.reasonFlagged)}</p>
                        </div>
                      ) : null}
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <div className="flex justify-between text-[13px]">
                          <span className="text-text-muted">Fraud risk score</span>
                          <span className="text-text-primary">{Number(detail.fraudRiskScore ?? 0)}</span>
                        </div>
                        {detail.videoTitle ? (
                          <div className="flex justify-between text-[13px] mt-1">
                            <span className="text-text-muted">Video</span>
                            <span className="text-text-primary truncate">{String(detail.videoTitle)}</span>
                          </div>
                        ) : null}
                        {(detail.challengeImpact as { inChallenge: boolean; challengeSlug?: string; challengeTitle?: string })?.inChallenge ? (
                          <div className="mt-1 text-[13px] text-amber-400/90">
                            Affects challenge: {(detail.challengeImpact as { challengeTitle?: string }).challengeTitle ?? '—'}
                          </div>
                        ) : null}
                        <div className="flex justify-between text-[13px] mt-1">
                          <span className="text-text-muted">Ranking</span>
                          <span className="text-text-primary">{detail.rankingExcluded ? 'Excluded' : 'Included'}</span>
                        </div>
                        <div className="flex justify-between text-[13px] mt-1">
                          <span className="text-text-muted">Status</span>
                          <span className="text-text-primary">{String(detail.status ?? 'PENDING')}</span>
                        </div>
                      </div>
                    </>
                  ) : detailTargetType === 'CHALLENGE_ENTRY' ? (
                    <>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 space-y-2">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide">Challenge</p>
                        <p className="text-[15px] font-medium text-text-primary">{String(detail.challengeTitle ?? '')}</p>
                        <p className="text-[13px] text-text-secondary">{String(detail.challengeSlug ?? '')} · {String(detail.challengeStatus ?? '')}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 space-y-2">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide">Creator & entry</p>
                        <p className="text-[15px] text-text-primary">{String(detail.creatorDisplayName ?? detail.creatorUsername ?? '')}</p>
                        <p className="text-[13px] text-text-secondary">{String(detail.videoTitle ?? '')}</p>
                        {detail.thumbnailUrl ? (
                          <img src={String(detail.thumbnailUrl)} alt="" className="w-full aspect-video rounded-lg object-cover bg-white/5 mt-2" />
                        ) : null}
                      </div>
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Suspicious support metrics</p>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Suspicious support count</span>
                            <span className="text-text-primary">{Number(detail.suspiciousSupportCount ?? 0)}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Support spike</span>
                            <span className="text-text-primary">{detail.supportSpike ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Integrity flagged</span>
                            <span className="text-text-primary">{detail.integrityFlagged ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Fairness status</span>
                            <span className="text-text-primary">{String(detail.fairnessStatus ?? 'CLEAN')}</span>
                          </div>
                        </div>
                      </div>
                      {(detail.fairnessFlags as string[])?.length > 0 ? (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                          <p className="text-[12px] font-medium text-amber-400/90 uppercase tracking-wide">Fairness flags</p>
                          <p className="text-[14px] text-text-primary mt-1">{(detail.fairnessFlags as string[]).join(' · ')}</p>
                        </div>
                      ) : null}
                      <div className="rounded-lg bg-accent/10 border border-accent/20 p-3">
                        <p className="text-[12px] font-medium text-accent/90 uppercase tracking-wide">Recommendation</p>
                        <p className="text-[14px] text-text-primary mt-1">{String(detail.recommendation ?? 'Approve')}</p>
                      </div>
                      {Array.isArray(detail.supportFlags) && detail.supportFlags.length > 0 ? (
                        <div>
                          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Support flags for this video</p>
                          <ul className="space-y-1 text-[13px] text-text-secondary">
                            {(detail.supportFlags as { type: string; status: string; createdAt: string }[]).slice(0, 5).map((f, i) => (
                              <li key={i}>{f.type} · {f.status} · {new Date(f.createdAt).toLocaleString()}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : detailTargetType === 'CREATOR_VERIFICATION' ? (
                    <>
                      {detail.user ? (
                        <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3 space-y-2">
                          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide">Creator</p>
                          <p className="text-[15px] font-medium text-text-primary">{String((detail.user as { displayName?: string }).displayName ?? (detail.user as { username?: string }).username)}</p>
                          <p className="text-[13px] text-text-muted">@{(detail.user as { username?: string }).username}</p>
                          <p className="text-[12px] text-white/50">
                            {(detail.user as { videosCount?: number }).videosCount ?? 0} videos · {(detail.user as { followersCount?: number }).followersCount ?? 0} followers
                          </p>
                        </div>
                      ) : null}
                      <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                        <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Verification</p>
                        <div className="grid grid-cols-2 gap-2 text-[13px]">
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Status</span>
                            <span className="text-text-primary">{String(detail.verificationStatus ?? 'PENDING')}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-text-muted">Level</span>
                            <span className="text-text-primary">{String(detail.verificationLevel ?? 'STANDARD_CREATOR')}</span>
                          </div>
                          {detail.reviewedAt ? (
                            <div className="flex justify-between col-span-2">
                              <span className="text-text-muted">Reviewed</span>
                              <span className="text-text-primary">{new Date(String(detail.reviewedAt)).toLocaleString()}</span>
                            </div>
                          ) : null}
                          {detail.rejectionReason ? (
                            <div className="col-span-2 mt-2 rounded bg-amber-500/10 border border-amber-500/20 p-2">
                              <p className="text-[12px] text-amber-400/90">{String(detail.rejectionReason)}</p>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {detail.requestPayload && typeof detail.requestPayload === 'object' ? (
                        <div className="rounded-lg bg-white/[0.04] border border-white/10 p-3">
                          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Request info</p>
                          <ul className="text-[13px] text-text-secondary space-y-1">
                            {(detail.requestPayload as { socialLinks?: string[] }).socialLinks?.length ? (
                              <li>Social: {(detail.requestPayload as { socialLinks: string[] }).socialLinks.slice(0, 3).join(', ')}</li>
                            ) : null}
                            {(detail.requestPayload as { portfolioLinks?: string[] }).portfolioLinks?.length ? (
                              <li>Portfolio: {(detail.requestPayload as { portfolioLinks: string[] }).portfolioLinks.slice(0, 3).join(', ')}</li>
                            ) : null}
                            {(detail.requestPayload as { musicPlatformLinks?: string[] }).musicPlatformLinks?.length ? (
                              <li>Music: {(detail.requestPayload as { musicPlatformLinks: string[] }).musicPlatformLinks.slice(0, 3).join(', ')}</li>
                            ) : null}
                            {(detail.requestPayload as { notes?: string }).notes ? (
                              <li className="mt-1 text-white/70">{(detail.requestPayload as { notes: string }).notes}</li>
                            ) : null}
                          </ul>
                        </div>
                      ) : null}
                      {Array.isArray((detail as Record<string, unknown>).notes) &&
                        ((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).length > 0 && (
                          <div>
                            <p className="text-[12px] font-medium text-text-muted uppercase tracking-wide mb-2">Moderation notes</p>
                            <ul className="space-y-2">
                              {((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).map((n, i) => (
                                <li key={i} className="text-[13px] text-text-secondary bg-white/5 rounded-lg p-2">
                                  {n.note} — {n.moderatorUsername} · {new Date(n.createdAt).toLocaleString()}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="text-[14px] text-text-secondary space-y-2">
                      {Object.entries(detail).map(
                        ([k, v]) =>
                          v != null &&
                          typeof v !== 'object' &&
                          !Array.isArray(v) &&
                          !['supportHistory', 'moderationEventHistory', 'notes', 'recentFlags'].includes(k) && (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-text-muted capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="text-text-primary truncate">{String(v)}</span>
                            </div>
                          )
                      )}
                    </div>
                  )}
                  {Array.isArray((detail as Record<string, unknown>).notes) &&
                    ((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).length > 0 && (
                      <div>
                        <h4 className="text-[13px] font-semibold text-text-primary mb-2">Notes</h4>
                        <ul className="space-y-2">
                          {((detail as Record<string, unknown>).notes as { note: string; createdAt: string; moderatorUsername: string }[]).map((n, i) => (
                            <li key={i} className="text-[13px] text-text-secondary bg-white/5 rounded-lg p-2">
                              {n.note} — {n.moderatorUsername} · {new Date(n.createdAt).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  <div className="pt-2">
                    <label className="block text-[13px] font-medium text-text-secondary mb-1">Add note or action reason</label>
                    <textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      placeholder="Optional note..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-canvas-tertiary border border-white/10 text-text-primary text-[14px] placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={addNote}
                        disabled={!actionNote.trim() || actionLoading}
                        className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                      >
                        Add note
                      </button>
                      {detailTargetType === 'VIDEO' && (
                        <>
                          <button
                            type="button"
                            onClick={() => performAction('CLEAR_VIDEO_FLAGS', undefined, 'False report – flags cleared')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Clear flags
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('CLEAR_VIDEO_FLAGS', undefined, 'Reviewed – approved')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Keep video
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('BLOCK_VIDEO', 'BLOCKED', actionNote || 'Video removed')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Remove video
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('FLAG', 'FLAGGED')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Flag
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('REMOVE_FROM_CHALLENGE')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Block challenge entry
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('FLAG', 'FLAGGED', 'Sent for deeper review')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-secondary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Send for deeper review
                          </button>
                        </>
                      )}
                      {detailTargetType === 'USER' && (
                        <>
                          <button
                            type="button"
                            onClick={() => performAction('WATCHLIST', 'WATCHLIST')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Add to watchlist
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('WARN', undefined, 'Warning issued')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Warn
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('RESTRICT_SUPPORT', 'LIMITED')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Restrict support actions
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('SUSPEND', 'SUSPENDED')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Suspend
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('BAN', 'BANNED')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/30 text-red-400 text-[13px] font-medium hover:bg-red-500/40 disabled:opacity-50"
                          >
                            Ban
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('CLEAR_RISK_STATE', 'CLEAN', 'False positive – risk state cleared')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Clear risk state
                          </button>
                        </>
                      )}
                      {detailTargetType === 'SUPPORT_FLAG' && (
                        <>
                          <button
                            type="button"
                            onClick={() => performAction('VALIDATE_SUPPORT')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Mark valid
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('EXCLUDE_FROM_RANKING')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Exclude from ranking
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('VOID_SUPPORT')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Void support
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('SEND_TO_FRAUD_REVIEW', undefined, 'Escalated for fraud review')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-secondary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Escalate
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('FREEZE_PAYOUT')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Freeze payout eligibility
                          </button>
                          {detail && (detail.senderId ?? detail.userId) ? (
                            <button
                              type="button"
                              onClick={() => performAction('WATCHLIST', 'WATCHLIST', undefined, 'USER', String(detail.senderId ?? detail.userId))}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                            >
                              Restrict involved account
                            </button>
                          ) : null}
                        </>
                      )}
                      {detailTargetType === 'CHALLENGE_ENTRY' && (
                        <>
                          <button
                            type="button"
                            onClick={() => performAction('EXCLUDE_ENTRY_SUPPORT', undefined, 'Support excluded from challenge ranking')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Exclude support from ranking
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('FREEZE_ENTRY', undefined, 'Entry frozen for review')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Freeze entry
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('DISQUALIFY_ENTRY', undefined, 'Entry disqualified')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Disqualify
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('RESTORE_ENTRY', undefined, 'Entry restored')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('RESTORE_ENTRY', undefined, 'Approved')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </>
                      )}
                      {detailTargetType === 'CREATOR_VERIFICATION' && (
                        <>
                          <button
                            type="button"
                            onClick={() => performAction('APPROVE_VERIFICATION', 'IDENTITY_VERIFIED')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Approve (Identity verified)
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('APPROVE_VERIFICATION', 'TRUSTED_PERFORMER')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Approve (Trusted performer)
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('APPROVE_VERIFICATION', 'OFFICIAL_ARTIST')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-[13px] font-medium hover:bg-green-500/30 disabled:opacity-50"
                          >
                            Approve (Official artist)
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('REJECT_VERIFICATION', undefined, actionNote || 'Rejected')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('REVOKE_VERIFICATION', undefined, actionNote || 'Revoked')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-[13px] font-medium hover:bg-amber-500/30 disabled:opacity-50"
                          >
                            Revoke
                          </button>
                          <button
                            type="button"
                            onClick={() => performAction('REQUEST_MORE_INFO', undefined, actionNote || 'More info requested')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-text-primary text-[13px] font-medium hover:bg-white/15 disabled:opacity-50"
                          >
                            Request more info
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-[14px] text-text-muted">No detail available.</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
