/** Feed fetch with timeout (6s) and retry (2 attempts). */

const FEED_TIMEOUT_MS = 6000;
const FEED_RETRY_COUNT = 2;

export async function fetchFeedWithRetry(
  url: string,
  options?: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= FEED_RETRY_COUNT; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res;
    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === FEED_RETRY_COUNT) break;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError ?? new Error('Feed fetch failed');
}
