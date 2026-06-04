import { createHash } from 'crypto';

/**
 * Title-based event clustering.
 *
 * 方案1: a smarter cluster key. Instead of hashing the raw first-30-chars of a
 * title (which breaks the moment two outlets reword the same event), we tokenize
 * the title into an order-independent set and hash that set. Reworded titles that
 * share the same salient tokens collapse to the same key.
 *
 * 方案2: fuzzy fallback. Titles that don't hash identically but still describe the
 * same event are merged by Jaccard similarity over their token sets (see
 * resolveClusterKey in authority.ts, which consumes tokenizeTitle + jaccardSimilarity).
 */

// Low-signal Latin words that add noise to similarity without distinguishing events.
const LATIN_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'is', 'are',
  'with', 'at', 'by', 'from', 'new', 'how', 'why', 'what', 'this', 'that',
]);

/**
 * Break a title into an order-independent token set.
 * - Latin/number runs become whole-word tokens (stopwords dropped).
 * - CJK runs become character bigrams (Chinese has no spaces, so bigrams are a
 *   cheap proxy for word boundaries — two articles on the same topic share many).
 */
export function tokenizeTitle(title: string): string[] {
  if (!title) return [];
  const lower = title.toLowerCase();
  const tokens = new Set<string>();

  for (const word of lower.match(/[a-z0-9]+/g) || []) {
    if (word.length < 2 || LATIN_STOPWORDS.has(word)) continue;
    tokens.add(word);
  }

  for (const run of lower.match(/[一-鿿]+/g) || []) {
    if (run.length === 1) {
      tokens.add(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }

  return [...tokens];
}

/** 方案1: cluster key = md5 of the sorted token set (falls back to raw title for token-less input). */
export function computeClusterKey(title: string): string {
  const tokens = tokenizeTitle(title);
  const basis = tokens.length > 0
    ? tokens.sort().join('|')
    : (title || '').slice(0, 30).toLowerCase().replace(/\s+/g, '');
  return createHash('md5').update(basis).digest('hex').slice(0, 16);
}

/**
 * L1: prefer a model-produced semantic event fingerprint (eventKey) over the
 * fragile token-md5 key. Same event reworded across outlets/languages yields the
 * same eventKey, so they collapse into one cluster. Falls back to computeClusterKey
 * when the model gave nothing usable.
 */
export function eventKeyToClusterKey(eventKey: string | undefined, title: string): string {
  const ek = (eventKey || '').trim().toLowerCase();
  if (ek.length >= 3) {
    return createHash('md5').update(`ek:${ek}`).digest('hex').slice(0, 16);
  }
  return computeClusterKey(title);
}

/** Jaccard similarity of two token sets: |intersection| / |union|, in [0, 1]. */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// 方案2 tuning. Conservative on purpose: prefer leaving two events un-merged over
// wrongly collapsing distinct events. Short titles (< MIN_TOKENS_FOR_FUZZY tokens)
// skip fuzzy matching entirely because tiny token sets produce unstable similarity.
export const TITLE_SIM_THRESHOLD = 0.6;
export const MIN_TOKENS_FOR_FUZZY = 4;
