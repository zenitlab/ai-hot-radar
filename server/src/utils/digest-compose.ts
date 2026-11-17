/**
 * Rule-based digest selection, borrowed from AIHOT (reports/edition.ts,
 * docs/selection.md step 7). No model call: it decides *which* items go into
 * the day's digest and in what order before any summarising happens.
 *
 * - One item per event (cluster), keeping the highest-scoring member.
 * - An event with a first-party report and 3+ independent sources that day
 *   joins even when none of its reports made 精选 (the caller adds those
 *   candidates; see `pickSupplements`).
 * - Events covered in the last REPEAT_WINDOW_DAYS digests come back only with
 *   news: 4+ sources in total, or a new first-party report that day. They rank
 *   below fresh events of similar weight.
 * - Ranked by importance (`importanceOf`), not score alone.
 * - At most PER_SOURCE_CAP items from the same source in the main list.
 * - MAIN_SIZE main items, then up to BRIEF_SIZE one-line briefs.
 */
export const MAIN_SIZE = 12;
export const BRIEF_SIZE = 10;
export const PER_SOURCE_CAP = 2;
export const REPEAT_WINDOW_DAYS = 7;
export const REPEAT_OVERRIDE_SOURCES = 4;
/** Independent sources an uncurated event needs, with a first-party report, to join anyway. */
export const SUPPLEMENT_MIN_SOURCES = 3;

/**
 * First-party report: the company or lab itself speaking. T1 alone isn't
 * enough, because some T1 feeds are T1 for their curation bar only: preprint
 * servers and paper digests (anyone can post there) and one media outlet.
 */
const NOT_FIRST_PARTY = /^rss_(?:arxiv_|hf_papers$|mit_tech$)/u;
export const isFirstParty = (r: { source: string; sourceTier?: string | null }) =>
  r.sourceTier === 'T1' && !NOT_FIRST_PARTY.test(r.source);

export type ComposeItem = {
  id: string;
  url: string;
  source: string;
  clusterKey: string | null;
  qualityScore: number | null;
  sourceTier?: string | null;
};

/** What the day looked like for one event, from all its reports in the window (curated or not). */
export type DayEvent = {
  /** Distinct sources reporting it that day. */
  sources: number;
  /** Whether one of that day's reports is first-party. */
  official: boolean;
};

export type ComposeResult<T> = { main: T[]; briefs: T[] };

/**
 * Importance of an event for ordering: its best score, plus 4 per extra
 * independent source that day (up to +16), plus 5 for a first-party report,
 * minus 10 for a follow-up to an event already in a recent digest. Same scale
 * as qualityScore, so a 90-point single-source item still outranks a
 * 70-point event two outlets picked up.
 */
export function importanceOf(score: number, day: DayEvent | undefined, isFollowUp: boolean): number {
  const sources = day?.sources ?? 1;
  return score + Math.min(16, 4 * Math.max(0, sources - 1)) + (day?.official ? 5 : 0) - (isFollowUp ? 10 : 0);
}

/**
 * Events that should join the digest although none of their reports is in
 * `candidates`: a first-party report that day and SUPPLEMENT_MIN_SOURCES or
 * more independent sources. Returns the first-party report to represent each.
 */
export function pickSupplements<T extends ComposeItem>(
  dayReports: T[],
  candidates: ComposeItem[],
  dayEvents: Map<string, DayEvent>,
): T[] {
  const covered = new Set(candidates.map((c) => c.clusterKey).filter(Boolean));
  const best = new Map<string, T>();
  for (const r of dayReports) {
    const key = r.clusterKey;
    if (!key || covered.has(key) || !isFirstParty(r)) continue;
    const day = dayEvents.get(key);
    if (!day?.official || day.sources < SUPPLEMENT_MIN_SOURCES) continue;
    const cur = best.get(key);
    if (!cur || (r.qualityScore ?? 0) > (cur.qualityScore ?? 0)) best.set(key, r);
  }
  return [...best.values()];
}

/** Per-event day stats from all of the day's reports. */
export function summariseDay(dayReports: ComposeItem[]): Map<string, DayEvent> {
  const sources = new Map<string, Set<string>>();
  const official = new Set<string>();
  for (const r of dayReports) {
    if (!r.clusterKey) continue;
    const set = sources.get(r.clusterKey) ?? new Set<string>();
    set.add(r.source);
    sources.set(r.clusterKey, set);
    if (isFirstParty(r)) official.add(r.clusterKey);
  }
  const out = new Map<string, DayEvent>();
  for (const [key, set] of sources) out.set(key, { sources: set.size, official: official.has(key) });
  return out;
}

/**
 * @param items candidate items for the day (curated, plus any supplements), any order
 * @param recentClusterKeys cluster keys that appeared in recent digests
 * @param sourceCountByCluster distinct-source count per cluster, all time (for the repeat override)
 * @param dayEvents per-event stats for the day (see summariseDay); empty means "one source, not official"
 */
export function composeDigestItems<T extends ComposeItem>(
  items: T[],
  recentClusterKeys: Set<string>,
  sourceCountByCluster: Map<string, number> = new Map(),
  dayEvents: Map<string, DayEvent> = new Map(),
): ComposeResult<T> {
  // Best member per event; items without a cluster are their own event.
  const best = new Map<string, T>();
  for (const it of items) {
    const key = it.clusterKey ?? `url:${it.url}`;
    const cur = best.get(key);
    if (!cur || (it.qualityScore ?? 0) > (cur.qualityScore ?? 0)) best.set(key, it);
  }

  const ranked = [...best.entries()]
    .flatMap(([key, it]) => {
      const day = it.clusterKey ? dayEvents.get(key) : undefined;
      const isFollowUp = Boolean(it.clusterKey && recentClusterKeys.has(key));
      if (isFollowUp) {
        // A repeat needs news: the company itself spoke again, or the story spread widely.
        const spread = (sourceCountByCluster.get(key) ?? 0) >= REPEAT_OVERRIDE_SOURCES;
        if (!spread && !day?.official) return [];
      }
      return [{ it, rank: importanceOf(it.qualityScore ?? 0, day, isFollowUp) }];
    })
    .sort((a, b) => b.rank - a.rank || (b.it.qualityScore ?? 0) - (a.it.qualityScore ?? 0))
    .map(({ it }) => it);

  const main: T[] = [];
  const briefs: T[] = [];
  const perSource = new Map<string, number>();
  for (const it of ranked) {
    const used = perSource.get(it.source) ?? 0;
    if (main.length < MAIN_SIZE && used < PER_SOURCE_CAP) {
      main.push(it);
      perSource.set(it.source, used + 1);
    } else if (briefs.length < BRIEF_SIZE) {
      briefs.push(it);
    }
    if (main.length >= MAIN_SIZE && briefs.length >= BRIEF_SIZE) break;
  }
  return { main, briefs };
}
