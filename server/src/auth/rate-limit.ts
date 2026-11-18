/**
 * In-memory attempt counter: after `max` failures inside `windowMs` the key is
 * locked until the window passes. One process, so a restart clears it; that is
 * acceptable for slowing down password guessing on a single-server site.
 */
export class AttemptLimiter {
  private hits = new Map<string, number[]>();

  constructor(private readonly max: number, private readonly windowMs: number) {}

  private recent(key: string, now: number): number[] {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  /** Milliseconds until the key may try again; 0 when it may try now. */
  retryAfter(key: string, now = Date.now()): number {
    const list = this.recent(key, now);
    return list.length >= this.max ? list[0] + this.windowMs - now : 0;
  }

  hit(key: string, now = Date.now()): void {
    const list = this.recent(key, now);
    list.push(now);
    this.hits.set(key, list);
    if (this.hits.size > 10_000) this.hits.delete(this.hits.keys().next().value as string);
  }

  clear(key: string): void {
    this.hits.delete(key);
  }
}
