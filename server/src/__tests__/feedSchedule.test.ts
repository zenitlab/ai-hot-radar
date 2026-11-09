import { describe, it, expect } from 'vitest';
import {
  FeedScheduler, adaptiveIntervalMin, MIN_INTERVAL_MIN, MAX_INTERVAL_MIN, MAX_BACKOFF_MIN, type FeedState,
} from '../utils/feed-schedule.js';

const H = 3600_000;
const D = 24 * H;

function state(over: Partial<FeedState>): FeedState {
  return { nextDueAt: 0, failCount: 0, newItemTimes: [], firstSeenAt: 0, ...over };
}

describe('adaptiveIntervalMin', () => {
  it('keeps new feeds at the minimum until a day of history exists', () => {
    expect(adaptiveIntervalMin(state({ firstSeenAt: 0 }), 2 * H)).toBe(MIN_INTERVAL_MIN);
  });

  it('pushes quiet feeds to the maximum', () => {
    const now = 7 * D;
    expect(adaptiveIntervalMin(state({ newItemTimes: [now - D] }), now)).toBe(MAX_INTERVAL_MIN);
  });

  it('follows 1440 / (perDay * 3) for moderate feeds', () => {
    const now = 7 * D;
    const times = Array.from({ length: 70 }, (_, i) => now - i * H); // 10 per day
    expect(adaptiveIntervalMin(state({ newItemTimes: times }), now)).toBe(48);
  });

  it('clamps busy feeds to the minimum', () => {
    const now = 7 * D;
    const times = Array.from({ length: 7000 }, () => now);
    expect(adaptiveIntervalMin(state({ newItemTimes: times }), now)).toBe(MIN_INTERVAL_MIN);
  });
});

describe('FeedScheduler', () => {
  it('is due immediately, then waits after a success', () => {
    let t = 0;
    const s = new FeedScheduler(() => t);
    expect(s.isDue('u')).toBe(true);
    s.recordSuccess('u', { newItems: 0 });
    expect(s.isDue('u')).toBe(false);
    t += MIN_INTERVAL_MIN * 60_000;
    expect(s.isDue('u')).toBe(true);
  });

  it('backs off on repeated failures and caps the wait', () => {
    let t = 0;
    const s = new FeedScheduler(() => t);
    s.recordFailure('u');
    expect(s.snapshot('u')!.nextDueAt).toBe(MIN_INTERVAL_MIN * 3 * 60_000);
    for (let i = 0; i < 50; i++) s.recordFailure('u');
    expect(s.snapshot('u')!.nextDueAt).toBe(MAX_BACKOFF_MIN * 60_000);
  });

  it('resets the failure count after a success', () => {
    const s = new FeedScheduler(() => 0);
    s.recordFailure('u');
    s.recordFailure('u');
    s.recordSuccess('u', { newItems: 0 });
    expect(s.snapshot('u')!.failCount).toBe(0);
  });

  it('sends conditional headers once validators are known', () => {
    const s = new FeedScheduler(() => 0);
    expect(s.conditionalHeaders('u')).toEqual({});
    s.recordSuccess('u', { etag: '"abc"', lastModified: 'Mon, 09 Nov 2026 00:00:00 GMT', newItems: 0 });
    expect(s.conditionalHeaders('u')).toEqual({
      'If-None-Match': '"abc"',
      'If-Modified-Since': 'Mon, 09 Nov 2026 00:00:00 GMT',
    });
  });
});
