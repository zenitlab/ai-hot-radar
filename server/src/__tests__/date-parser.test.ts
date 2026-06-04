import { describe, it, expect } from 'vitest';
import { parseLooseDate, findOldestDateInText, extractDateFromUrl } from '../utils/date-parser';

// Fixed reference point so tests are deterministic regardless of run date.
const NOW = new Date('2026-06-04T00:00:00Z');
const iso = (d?: Date) => (d ? d.toISOString().slice(0, 10) : undefined);

describe('parseLooseDate', () => {
  it('parses past absolute dates (ISO + Chinese)', () => {
    expect(iso(parseLooseDate('2026-03-27', NOW))).toBe('2026-03-27');
    expect(iso(parseLooseDate('2026年3月27日', NOW))).toBe('2026-03-27');
    expect(iso(parseLooseDate('Mar 27, 2026', NOW))).toBe('2026-03-27');
  });

  it('rejects future absolute dates with an explicit year', () => {
    // Exactly the EULER/arXiv bug input: an "effective date" in the future.
    expect(parseLooseDate('2026年7月1日', NOW)).toBeUndefined();
    expect(parseLooseDate('2026-07-01', NOW)).toBeUndefined();
  });

  it('rolls a year-less date that lands in the future back to last year', () => {
    // "7月1日" seen on 2026-06-04 means last July, not next month.
    expect(iso(parseLooseDate('7月1日', NOW))).toBe('2025-07-01');
    // A year-less date already in the past keeps the current year.
    expect(iso(parseLooseDate('3月27日', NOW))).toBe('2026-03-27');
  });

  it('handles relative dates (always in the past)', () => {
    expect(iso(parseLooseDate('3 days ago', NOW))).toBe('2026-06-01');
    expect(iso(parseLooseDate('2天前', NOW))).toBe('2026-06-02');
  });
});

describe('findOldestDateInText', () => {
  it('ignores a lone future date and returns undefined', () => {
    // The root cause: snippet only carries a forward-looking effective date.
    expect(findOldestDateInText('arXiv 将于 2026年7月1日起独立运营', NOW)).toBeUndefined();
  });

  it('returns the oldest PAST date, skipping future references', () => {
    expect(iso(findOldestDateInText('发布于 2026年3月27日，将于 2026年7月1日生效', NOW))).toBe('2026-03-27');
    expect(iso(findOldestDateInText('Posted 2026-02-10, updated 2026-12-01', NOW))).toBe('2026-02-10');
  });

  it('returns undefined when no date is present', () => {
    expect(findOldestDateInText('no dates in this snippet', NOW)).toBeUndefined();
  });
});

describe('extractDateFromUrl', () => {
  it('parses a dated URL path', () => {
    expect(iso(extractDateFromUrl('https://example.com/2020/01/15/post'))).toBe('2020-01-15');
  });

  it('rejects a future-dated URL path', () => {
    const future = new Date(Date.now() + 40 * 86400000);
    const url = `https://example.com/${future.getUTCFullYear()}/${future.getUTCMonth() + 1}/${future.getUTCDate()}/post`;
    expect(extractDateFromUrl(url)).toBeUndefined();
  });
});
