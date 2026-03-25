'use client';

/**
 * Single POST shape for qualified public views. Credentials include session cookie.
 */
export async function postQualifiedView(params: {
  videoId: string;
  qualifiedWatchSeconds: number;
  durationSecondsClient?: number;
  source?: 'feed' | 'detail' | 'modal';
}): Promise<{ ok: boolean; counted?: boolean }> {
  const { videoId, qualifiedWatchSeconds, durationSecondsClient, source } = params;
  try {
    const res = await fetch('/api/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        videoId,
        qualifiedWatchSeconds,
        durationSecondsClient,
        source: source ?? 'feed',
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; counted?: boolean };
    return { ok: !!data.ok, counted: data.counted };
  } catch {
    return { ok: false };
  }
}
