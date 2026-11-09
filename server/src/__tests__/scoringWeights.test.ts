import { describe, it, expect } from 'vitest';
import { ScoringService, TYPE_WEIGHTS, type FiveDimScore } from '../services/scoring.service.js';
import { CURATED_THRESHOLD } from '../rss-feeds/feeds.config.js';

const svc = new ScoringService({} as never);
const dims = (over: Partial<FiveDimScore>): FiveDimScore => ({
  contentType: 'industry_event',
  relevToAi: 0, novelty: 0, audience: 0, quality: 0, actionable: 0,
  importance: 'low', summary: '', tags: [],
  ...over,
});

describe('TYPE_WEIGHTS', () => {
  it('every row sums to 10 so scores stay on the 0-100 scale', () => {
    for (const [type, w] of Object.entries(TYPE_WEIGHTS)) {
      expect(w.reduce((a, b) => a + b, 0), type).toBe(10);
    }
  });
});

describe('computeQualityScore', () => {
  it('maxes at 100 for a T2 item scoring 10 everywhere', () => {
    const all10 = { relevToAi: 10, novelty: 10, audience: 10, quality: 10, actionable: 10 };
    for (const t of Object.keys(TYPE_WEIGHTS) as FiveDimScore['contentType'][]) {
      expect(svc.computeQualityScore(dims({ ...all10, contentType: t }), 'T2')).toBe(100);
    }
  });

  it('weights actionability heavily for tools but not for industry events', () => {
    const usable = { relevToAi: 6, novelty: 6, audience: 6, quality: 6, actionable: 10 };
    const tool = svc.computeQualityScore(dims({ ...usable, contentType: 'tool_or_tip' }), 'T2');
    const event = svc.computeQualityScore(dims({ ...usable, contentType: 'industry_event' }), 'T2');
    expect(tool).toBeGreaterThan(event);
  });

  it('does not inflate scores by source tier (tier only picks the threshold)', () => {
    const d = dims({ relevToAi: 8, novelty: 8, audience: 8, quality: 8, actionable: 8 });
    expect(svc.computeQualityScore(d, 'T1')).toBe(80);
    expect(svc.computeQualityScore(d, 'T2')).toBe(80);
  });
});

describe('typeFromCategory', () => {
  it('maps pre-filter categories to content types', () => {
    expect(svc.typeFromCategory('research')).toBe('research_paper');
    expect(svc.typeFromCategory('tips')).toBe('tool_or_tip');
    expect(svc.typeFromCategory('unknown')).toBe('industry_event');
  });
});

describe('CURATED_THRESHOLD', () => {
  it('trusts official sources more by lowering their bar, not raising their score', () => {
    expect(CURATED_THRESHOLD.T1).toBeLessThan(CURATED_THRESHOLD['T1.5']);
    expect(CURATED_THRESHOLD['T1.5']).toBeLessThan(CURATED_THRESHOLD.T2);
  });
});
