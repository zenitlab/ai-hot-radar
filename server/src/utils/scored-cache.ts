/**
 * Remembers URLs that were already sent to the AI but did NOT become a hotspot
 * (pre-filter said non-AI, or quality < 60, or keyword relevance gate failed).
 *
 * Why: dedup before scoring only checks the DB, and rejected items are never
 * written there. Search sources (Bing / HN / Bilibili / Twitter) return mostly
 * the same results every round, so without this the same rejected items get
 * re-scored on every scan.
 *
 * In-memory only: a restart clears it, and the first round after a restart
 * re-scores the backlog once. TTL bounds memory and lets an item be re-checked
 * if it comes back much later.
 */
export class ScoredCache {
  private readonly rejected = new Map<string, number>(); // key -> expiresAt (ms)
  private hits = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 50_000,
  ) {}

  /** True if this key was scored and rejected within the TTL window. */
  isRejected(key: string): boolean {
    const exp = this.rejected.get(key);
    if (exp === undefined) return false;
    if (exp < Date.now()) {
      this.rejected.delete(key);
      return false;
    }
    this.hits++;
    return true;
  }

  markRejected(key: string): void {
    if (this.rejected.size >= this.maxEntries) this.evictExpired();
    // Still full: drop the oldest insertion (Map preserves insertion order).
    if (this.rejected.size >= this.maxEntries) {
      const oldest = this.rejected.keys().next().value;
      if (oldest !== undefined) this.rejected.delete(oldest);
    }
    this.rejected.set(key, Date.now() + this.ttlMs);
  }

  /** Number of skips since the last call, for per-round logging. */
  takeHits(): number {
    const h = this.hits;
    this.hits = 0;
    return h;
  }

  get size(): number {
    return this.rejected.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [k, exp] of this.rejected) {
      if (exp < now) this.rejected.delete(k);
    }
  }
}
