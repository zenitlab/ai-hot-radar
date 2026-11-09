/**
 * Cross-source event heat, borrowed from AIHOT (events/hot.ts):
 *
 *   heat = Σ over distinct participants  0.5 ^ (hoursSinceThatParticipantLastReported / 24)
 *
 * An "event" is a cluster (same clusterKey). Each independent participant counts
 * once, so ten reposts from one outlet don't outweigh three different outlets.
 * Only items published in the last WINDOW_HOURS count. An event needs at least
 * MIN_PARTICIPANTS to rank, i.e. it has to be corroborated.
 */
export const HALF_LIFE_HOURS = 24;
export const WINDOW_HOURS = 48;
export const MIN_PARTICIPANTS = 2;
/** Trend compares heat now vs this many hours ago. */
export const TREND_LOOKBACK_HOURS = 6;

export type HeatItem = {
  id: string;
  clusterKey: string | null;
  source: string;
  authorUsername?: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

export type EventHeat = {
  clusterKey: string;
  heat: number;
  participants: string[];
  /** 'new' = no heat 6h ago, 'rising' = heat grew, otherwise null. */
  trend: 'new' | 'rising' | null;
  itemIds: string[];
  firstSeenAt: Date;
};

/**
 * Participant identity. Community sources (HN, Bilibili, keyword Twitter search)
 * are split by author, since different people posting is real corroboration;
 * everything else (RSS feeds, X accounts) is one participant per source.
 */
export function participantOf(item: HeatItem): string {
  const communal = item.source === 'hackernews' || item.source === 'bilibili' || item.source === 'twitter';
  if (communal && item.authorUsername) return `${item.source}:${item.authorUsername.toLowerCase()}`;
  return item.source;
}

function heatAt(lastByParticipant: Map<string, number>, at: number): number {
  let heat = 0;
  for (const last of lastByParticipant.values()) {
    if (last > at) continue;
    heat += 0.5 ** ((at - last) / 3600_000 / HALF_LIFE_HOURS);
  }
  return heat;
}

export function computeEventHeat(items: HeatItem[], now: number = Date.now()): EventHeat[] {
  const windowStart = now - WINDOW_HOURS * 3600_000;
  const prevAt = now - TREND_LOOKBACK_HOURS * 3600_000;

  const byCluster = new Map<string, HeatItem[]>();
  for (const it of items) {
    if (!it.clusterKey) continue;
    const t = (it.publishedAt ?? it.createdAt).getTime();
    if (t < windowStart || t > now) continue;
    const list = byCluster.get(it.clusterKey) ?? [];
    list.push(it);
    byCluster.set(it.clusterKey, list);
  }

  const events: EventHeat[] = [];
  for (const [clusterKey, list] of byCluster) {
    const last = new Map<string, number>();
    const lastPrev = new Map<string, number>();
    let first = Infinity;
    for (const it of list) {
      const t = (it.publishedAt ?? it.createdAt).getTime();
      first = Math.min(first, t);
      const p = participantOf(it);
      last.set(p, Math.max(last.get(p) ?? -Infinity, t));
      if (t <= prevAt) lastPrev.set(p, Math.max(lastPrev.get(p) ?? -Infinity, t));
    }
    if (last.size < MIN_PARTICIPANTS) continue;

    const heat = heatAt(last, now);
    const prevHeat = heatAt(lastPrev, prevAt);
    const trend = lastPrev.size === 0 ? 'new' : heat > prevHeat ? 'rising' : null;
    events.push({
      clusterKey,
      heat: Math.round(heat * 100) / 100,
      participants: [...last.keys()],
      trend,
      itemIds: list.map(i => i.id),
      firstSeenAt: new Date(first),
    });
  }

  return events.sort((a, b) => b.heat - a.heat);
}
