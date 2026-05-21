/**
 * Generic retry helper with exponential backoff. Use it to wrap network-IO
 * calls (Bing scrape, Bilibili API, etc.) so a transient blip doesn't drop
 * an entire batch of search results.
 *
 * Inspired by the retry decorator in BiliAgent's bilibili_tools/get_bilibi.py.
 *
 * Usage:
 *   const result = await withRetry(
 *     () => axios.get(url),
 *     { retries: 2, delayMs: 600, label: 'Bing' }
 *   );
 */
export interface RetryOptions {
  /** How many extra attempts on top of the first try. Default 2 → 3 attempts total. */
  retries?: number;
  /** Initial delay before the first retry. Default 600ms. */
  delayMs?: number;
  /** Multiplier applied after each failure. Default 1.5 → 600 → 900 → 1350ms. */
  backoff?: number;
  /** Tag for logs so you can tell which source is retrying. */
  label?: string;
  /**
   * Decide if a thrown error is worth retrying. Defaults: retry on
   * network/5xx/429/timeout-ish errors; do NOT retry on 4xx (auth, bad request).
   */
  isRetryable?: (err: unknown) => boolean;
}

const DEFAULT_OPTS: Required<Pick<RetryOptions, 'retries' | 'delayMs' | 'backoff'>> = {
  retries: 2,
  delayMs: 600,
  backoff: 1.5,
};

function defaultIsRetryable(err: unknown): boolean {
  // Treat 4xx (except 429) as permanent — retrying won't help.
  // 5xx, network errors, timeouts, and 429 → retry.
  const e = err as { code?: string; response?: { status?: number }; message?: string };
  const status = e?.response?.status;
  if (status !== undefined) {
    if (status >= 500) return true;
    if (status === 429) return true;
    return false; // 4xx is bad request / auth — pointless to retry
  }
  // Axios-style network error codes
  if (e?.code === 'ECONNRESET' || e?.code === 'ETIMEDOUT' || e?.code === 'ECONNABORTED') return true;
  if (typeof e?.message === 'string' && /timeout|network|fetch failed/i.test(e.message)) return true;
  // Unknown — be conservative, retry once just in case
  return true;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries, delayMs, backoff } = { ...DEFAULT_OPTS, ...opts };
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;
  const label = opts.label ?? 'request';

  let attempt = 0;
  let wait = delayMs;
  // First attempt + `retries` retries → max attempts = retries + 1
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > retries || !isRetryable(err)) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[${label}] retry ${attempt}/${retries} after ${wait}ms — ${msg.slice(0, 100)}`);
      await sleep(wait);
      wait = Math.round(wait * backoff);
    }
  }
}
