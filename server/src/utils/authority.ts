import type { SourceTier } from '../rss-feeds/feeds.config';

/**
 * Compute an authority score for a hotspot's source. Higher = more authoritative.
 *
 * Used for cluster main selection: when multiple sources cover the same event,
 * the main item should be the most authoritative one (e.g. OpenAI Blog beats V2EX repost).
 */
export function getAuthorityScore(source: string, sourceTier: SourceTier | null | undefined): number {
  const tierScore = sourceTier === 'T1' ? 1000 : sourceTier === 'T1.5' ? 500 : 100;

  let sourceBonus = 0;
  if (source.startsWith('rss_')) {
    const cat = source.slice(4);
    const officialLabs = new Set([
      'openai', 'anthropic', 'google_ai', 'deepmind', 'hugging_face', 'microsoft_ai',
      'mit_tech', 'arxiv_ai', 'arxiv_lg', 'arxiv_cl', 'arxiv_cv',
    ]);
    sourceBonus = officialLabs.has(cat) ? 100 : 50;
  } else if (source.startsWith('twitter_')) {
    // X account-sourced items (e.g. twitter_openai). More authoritative than generic
    // keyword-search twitter results because these are direct subscriptions.
    sourceBonus = 80;
  } else if (source === 'twitter') {
    sourceBonus = 30;
  } else if (source === 'hackernews') {
    sourceBonus = 20;
  } else if (source === 'bing') {
    sourceBonus = 10;
  } else {
    // sogou / bilibili / weibo — search/community, lowest
    sourceBonus = 5;
  }

  return tierScore + sourceBonus;
}

export type ClusterClaim = {
  /** ID of the current main hotspot for this cluster, if it has been persisted. */
  hotspotId?: string;
  authority: number;
};

/**
 * For a batch of items, decide which cluster gets a new main and which old main needs demotion.
 * Returns:
 *   - mainIdx: Map<clusterKey, idx> — the winning index per cluster within this batch (only items that pass filter)
 *   - demotions: Set<oldHotspotId> — IDs of existing mains that lost to a batch winner
 */
export function planClusterMains(
  itemCount: number,
  getItem: (idx: number) => { clusterKey: string; authority: number; passes: boolean },
  existingClaims: Map<string, ClusterClaim>,
): { mainIdx: Map<string, number>; demotions: Set<string> } {
  const mainIdx = new Map<string, number>();
  const demotions = new Set<string>();

  for (let i = 0; i < itemCount; i++) {
    const it = getItem(i);
    if (!it.passes) continue;

    const existing = existingClaims.get(it.clusterKey);
    const currentWinner = mainIdx.get(it.clusterKey);

    // Compare against existing DB main first
    if (existing && it.authority <= existing.authority) continue;

    // Compare against batch-internal winner
    if (currentWinner !== undefined) {
      const winnerAuth = getItem(currentWinner).authority;
      if (it.authority <= winnerAuth) continue;
    }

    mainIdx.set(it.clusterKey, i);
  }

  // Compute demotions: any cluster where batch winner beats existing main
  for (const [ck, idx] of mainIdx.entries()) {
    const existing = existingClaims.get(ck);
    const auth = getItem(idx).authority;
    if (existing?.hotspotId && auth > existing.authority) {
      demotions.add(existing.hotspotId);
    }
  }

  return { mainIdx, demotions };
}

