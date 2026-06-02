import type { SourceTier } from '../rss-feeds/feeds.config';
import {
  jaccardSimilarity,
  TITLE_SIM_THRESHOLD,
  MIN_TOKENS_FOR_FUZZY,
} from './title-cluster';

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
  /** Token set of the cluster main's title, used for fuzzy (方案2) cluster matching. */
  tokens?: string[];
};

/**
 * 方案2: resolve which cluster a new item belongs to.
 *
 * 1. Exact key already claimed → join it (方案1 token-set hash already matched).
 * 2. Otherwise compare the item's title tokens against every claimed cluster's
 *    tokens; if the best Jaccard similarity clears TITLE_SIM_THRESHOLD, join that
 *    cluster — this merges reworded headlines of the same event that didn't hash
 *    identically.
 * 3. No match → keep the item's own key (it starts a new cluster).
 *
 * Conservative by design: short titles skip fuzzy matching, and similarity must
 * strictly exceed the threshold, so distinct events are not wrongly merged.
 */
export function resolveClusterKey(
  tokens: string[],
  exactKey: string,
  claims: Map<string, ClusterClaim>,
): string {
  if (claims.has(exactKey)) return exactKey;
  if (tokens.length < MIN_TOKENS_FOR_FUZZY) return exactKey;

  let bestKey = exactKey;
  let bestSim = TITLE_SIM_THRESHOLD;
  for (const [key, claim] of claims) {
    if (!claim.tokens || claim.tokens.length < MIN_TOKENS_FOR_FUZZY) continue;
    const sim = jaccardSimilarity(tokens, claim.tokens);
    if (sim > bestSim) {
      bestSim = sim;
      bestKey = key;
    }
  }
  return bestKey;
}

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

