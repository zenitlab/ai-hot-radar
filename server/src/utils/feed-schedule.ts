/**
 * Per-feed fetch scheduling, borrowed from AIHOT (sources/collect.ts, sources/rss.ts):
 *
 * - Adaptive interval: quiet feeds are fetched less often.
 *     interval = clamp(1440 / (avgItemsPerDay * 3), MIN, MAX) minutes
 *   i.e. aim for ~3 fetches per new item. Feeds with almost no output sit at MAX.
 * - Failure backoff: after N consecutive failures wait interval * (N + 2), capped.
 * - Conditional GET: remember ETag / Last-Modified so unchanged feeds return 304.
 *
 * State is in-memory. A restart resets every feed to "due now", which is the
 * same behaviour as before this was added.
 */
export const MIN_INTERVAL_MIN = 15;
export const MAX_INTERVAL_MIN = 120;
export const MAX_BACKOFF_MIN = 360;
const YIELD_WINDOW_MS = 7 * 24 * 3600 * 1000;

export type FeedState = {
  nextDueAt: number;
  failCount: number;
  etag?: string;
  lastModified?: string;
  /** Timestamps (ms) of items first seen from this feed, pruned to the yield window. */
  newItemTimes: number[];
  /** When we started tracking; a feed younger than the window isn't judged as quiet. */
  firstSeenAt: number;
};

export function adaptiveIntervalMin(state: FeedState, now: number): number {
  const ageMs = Math.max(now - state.firstSeenAt, 1);
  // Not enough history yet: don't slow a feed down before we know it's quiet.
  if (ageMs < 24 * 3600 * 1000) return MIN_INTERVAL_MIN;
  const windowDays = Math.min(ageMs, YIELD_WINDOW_MS) / (24 * 3600 * 1000);
  const perDay = state.newItemTimes.length / windowDays;
  if (perDay <= 0.15) return MAX_INTERVAL_MIN;
  const raw = 1440 / (perDay * 3);
  return Math.min(MAX_INTERVAL_MIN, Math.max(MIN_INTERVAL_MIN, Math.round(raw)));
}

export class FeedScheduler {
  private readonly states = new Map<string, FeedState>();

  constructor(private readonly now: () => number = Date.now) {}

  private get(url: string): FeedState {
    let st = this.states.get(url);
    if (!st) {
      st = { nextDueAt: 0, failCount: 0, newItemTimes: [], firstSeenAt: this.now() };
      this.states.set(url, st);
    }
    return st;
  }

  isDue(url: string): boolean {
    return this.get(url).nextDueAt <= this.now();
  }

  conditionalHeaders(url: string): Record<string, string> {
    const st = this.get(url);
    const h: Record<string, string> = {};
    if (st.etag) h['If-None-Match'] = st.etag;
    if (st.lastModified) h['If-Modified-Since'] = st.lastModified;
    return h;
  }

  /** Record a successful fetch (200 or 304). newItems = items not seen in earlier fetches. */
  recordSuccess(url: string, opts: { etag?: string; lastModified?: string; newItems: number }): void {
    const st = this.get(url);
    const now = this.now();
    st.failCount = 0;
    if (opts.etag) st.etag = opts.etag;
    if (opts.lastModified) st.lastModified = opts.lastModified;
    for (let i = 0; i < opts.newItems; i++) st.newItemTimes.push(now);
    st.newItemTimes = st.newItemTimes.filter(t => now - t <= YIELD_WINDOW_MS);
    st.nextDueAt = now + adaptiveIntervalMin(st, now) * 60_000;
  }

  recordFailure(url: string): void {
    const st = this.get(url);
    const now = this.now();
    st.failCount++;
    const wait = Math.min(adaptiveIntervalMin(st, now) * (st.failCount + 2), MAX_BACKOFF_MIN);
    st.nextDueAt = now + wait * 60_000;
  }

  snapshot(url: string): Readonly<FeedState> | undefined {
    return this.states.get(url);
  }
}
