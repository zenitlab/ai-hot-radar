import { describe, it, expect, vi, afterEach } from 'vitest';
import { ScoredCache } from '../utils/scored-cache.js';

describe('ScoredCache', () => {
  afterEach(() => vi.useRealTimers());

  it('remembers rejected keys and counts hits', () => {
    const c = new ScoredCache(60_000);
    expect(c.isRejected('a')).toBe(false);
    c.markRejected('a');
    expect(c.isRejected('a')).toBe(true);
    expect(c.isRejected('a')).toBe(true);
    expect(c.isRejected('b')).toBe(false);
    expect(c.takeHits()).toBe(2);
    expect(c.takeHits()).toBe(0);
  });

  it('expires keys after the TTL', () => {
    vi.useFakeTimers();
    const c = new ScoredCache(1000);
    c.markRejected('a');
    vi.advanceTimersByTime(999);
    expect(c.isRejected('a')).toBe(true);
    vi.advanceTimersByTime(2);
    expect(c.isRejected('a')).toBe(false);
    expect(c.size).toBe(0);
  });

  it('caps size by evicting the oldest entry', () => {
    const c = new ScoredCache(60_000, 2);
    c.markRejected('a');
    c.markRejected('b');
    c.markRejected('c');
    expect(c.size).toBe(2);
    expect(c.isRejected('a')).toBe(false);
    expect(c.isRejected('b')).toBe(true);
    expect(c.isRejected('c')).toBe(true);
  });
});
