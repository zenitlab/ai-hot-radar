/**
 * Rule-based digest selection, borrowed from AIHOT (reports/compose.ts,
 * docs/selection.md step 7). No model call: it decides *which* items go into
 * the day's digest before any summarising happens.
 *
 * - One item per event (cluster), keeping the highest-scoring member.
 * - Events already covered in the last REPEAT_WINDOW_DAYS digests are skipped,
 *   unless the event is now big (>= REPEAT_OVERRIDE_SOURCES distinct sources).
 * - At most PER_SOURCE_CAP items from the same source in the main list.
 * - MAIN_SIZE main items, then up to BRIEF_SIZE one-line briefs.
 */
export const MAIN_SIZE = 12;
export const BRIEF_SIZE = 10;
export const PER_SOURCE_CAP = 2;
export const REPEAT_WINDOW_DAYS = 7;
export const REPEAT_OVERRIDE_SOURCES = 4;

export type ComposeItem = {
  id: string;
  url: string;
  source: string;
  clusterKey: string | null;
  qualityScore: number | null;
};

export type ComposeResult<T> = { main: T[]; briefs: T[] };

/**
 * @param items candidate items for the day, any order
 * @param recentClusterKeys cluster keys that appeared in recent digests
 * @param sourceCountByCluster distinct-source count per cluster (for the repeat override)
 */
export function composeDigestItems<T extends ComposeItem>(
  items: T[],
  recentClusterKeys: Set<string>,
  sourceCountByCluster: Map<string, number> = new Map(),
): ComposeResult<T> {
  // Best member per event; items without a cluster are their own event.
  const best = new Map<string, T>();
  for (const it of items) {
    const key = it.clusterKey ?? `url:${it.url}`;
    const cur = best.get(key);
    if (!cur || (it.qualityScore ?? 0) > (cur.qualityScore ?? 0)) best.set(key, it);
  }

  const ranked = [...best.entries()]
    .filter(([key, it]) => {
      if (!it.clusterKey || !recentClusterKeys.has(key)) return true;
      return (sourceCountByCluster.get(key) ?? 0) >= REPEAT_OVERRIDE_SOURCES;
    })
    .map(([, it]) => it)
    .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

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
