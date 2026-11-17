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

/**
 * Overlap coefficient: |intersection| / min(|A|, |B|), in [0, 1].
 * Unlike Jaccard it isn't dragged down when one headline is much longer than the
 * other ("OpenAI 发布 GPT-5.7" vs a 40-char rewrite of the same news). Borrowed
 * from AIHOT's lexical recall (events/relate.ts).
 */
export function overlapCoefficient(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  return intersection / Math.min(setA.size, setB.size);
}

// 方案2 tuning. Conservative on purpose: prefer leaving two events un-merged over
// wrongly collapsing distinct events. Short titles (< MIN_TOKENS_FOR_FUZZY tokens)
// skip fuzzy matching entirely because tiny token sets produce unstable similarity.
export const TITLE_SIM_THRESHOLD = 0.6;
/** Overlap bar is stricter than AIHOT's 0.25 because we have no LLM relation check behind it. */
export const TITLE_OVERLAP_THRESHOLD = 0.75;
export const MIN_TOKENS_FOR_FUZZY = 4;

/**
 * Within one event, reports whose headline is all but a copy of an earlier
 * report's (a wire story reposted, an aggregator re-titling a press release).
 * Stricter than clustering: these are folded under the earlier report on the
 * event page ("另有 N 条近似转述"), so a wrong fold would hide a real report.
 * Borrowed from agihunt.info's "近重复转述". `items` must be oldest first;
 * returns duplicate id → id of the earliest report it copies. Items marked
 * `keep` (first-party reports) are never folded, even under an earlier repost.
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.8;

export function findNearDuplicates(items: Array<{ id: string; title: string; keep?: boolean }>): Map<string, string> {
  const kept: Array<{ id: string; tokens: string[]; text: string }> = [];
  const dupOf = new Map<string, string>();
  for (const it of items) {
    const text = it.title.replace(/\s+/gu, ' ').trim().toLowerCase();
    const tokens = tokenizeTitle(it.title);
    const orig = !it.keep && kept.find(
      (k) =>
        k.text === text ||
        (tokens.length >= MIN_TOKENS_FOR_FUZZY &&
          k.tokens.length >= MIN_TOKENS_FOR_FUZZY &&
          jaccardSimilarity(k.tokens, tokens) >= NEAR_DUPLICATE_THRESHOLD),
    );
    if (orig) dupOf.set(it.id, orig.id);
    else kept.push({ id: it.id, tokens, text });
  }
  return dupOf;
}
