import { describe, it, expect } from 'vitest';
import {
  composeDigestItems, importanceOf, isFirstParty, pickSupplements, summariseDay,
  MAIN_SIZE, BRIEF_SIZE, PER_SOURCE_CAP, type ComposeItem, type DayEvent,
} from '../utils/digest-compose.js';

let n = 0;
const it_ = (over: Partial<ComposeItem>): ComposeItem => ({
  id: `i${n}`, url: `https://x/${n++}`, source: `s${n}`, clusterKey: `c${n}`, qualityScore: 70, ...over,
});

describe('composeDigestItems', () => {
  it('keeps one item per event, the highest scoring', () => {
    const r = composeDigestItems([
      it_({ clusterKey: 'e1', qualityScore: 70, id: 'low' }),
      it_({ clusterKey: 'e1', qualityScore: 90, id: 'high' }),
    ], new Set());
    expect(r.main.map(i => i.id)).toEqual(['high']);
  });

  it('skips events seen in recent digests unless they grew to 4+ sources', () => {
    const items = [it_({ clusterKey: 'old' }), it_({ clusterKey: 'big' }), it_({ clusterKey: 'fresh' })];
    const r = composeDigestItems(items, new Set(['old', 'big']), new Map([['big', 4], ['old', 2]]));
    expect(r.main.map(i => i.clusterKey).sort()).toEqual(['big', 'fresh']);
  });

  it('caps a single source in the main list and spills the rest to briefs', () => {
    const items = Array.from({ length: 5 }, (_, i) => it_({ source: 'same', qualityScore: 90 - i }));
    const r = composeDigestItems(items, new Set());
    expect(r.main).toHaveLength(PER_SOURCE_CAP);
    expect(r.briefs).toHaveLength(3);
  });

  it('limits main and brief sizes and orders by score', () => {
    const items = Array.from({ length: 40 }, (_, i) => it_({ qualityScore: i }));
    const r = composeDigestItems(items, new Set());
    expect(r.main).toHaveLength(MAIN_SIZE);
    expect(r.briefs).toHaveLength(BRIEF_SIZE);
    expect(r.main[0].qualityScore).toBe(39);
  });
});

describe('repeat events', () => {
  it('lets a recent event back when the company itself posted again that day', () => {
    const day = new Map<string, DayEvent>([['old', { sources: 1, official: true }]]);
    const r = composeDigestItems([it_({ clusterKey: 'old' })], new Set(['old']), new Map([['old', 2]]), day);
    expect(r.main).toHaveLength(1);
  });

  it('ranks a follow-up below a fresh event of the same score', () => {
    const items = [it_({ clusterKey: 'old', qualityScore: 80 }), it_({ clusterKey: 'new', qualityScore: 80 })];
    const r = composeDigestItems(items, new Set(['old']), new Map([['old', 5]]));
    expect(r.main.map((i) => i.clusterKey)).toEqual(['new', 'old']);
  });
});

describe('importanceOf', () => {
  it('adds weight for independent sources (capped) and first-party reports', () => {
    expect(importanceOf(70, undefined, false)).toBe(70);
    expect(importanceOf(70, { sources: 3, official: false }, false)).toBe(78);
    expect(importanceOf(70, { sources: 20, official: true }, false)).toBe(91);
    expect(importanceOf(70, { sources: 1, official: false }, true)).toBe(60);
  });

  it('orders the digest by importance, not score alone', () => {
    const items = [it_({ clusterKey: 'solo', qualityScore: 80 }), it_({ clusterKey: 'wide', qualityScore: 72 })];
    const day = new Map<string, DayEvent>([['wide', { sources: 4, official: true }]]);
    const r = composeDigestItems(items, new Set(), new Map(), day);
    expect(r.main.map((i) => i.clusterKey)).toEqual(['wide', 'solo']);
  });
});

describe('summariseDay and pickSupplements', () => {
  const report = (clusterKey: string, source: string, sourceTier: string, qualityScore = 50): ComposeItem =>
    it_({ clusterKey, source, sourceTier, qualityScore });

  const dayReports = [
    report('big', 'rss_openai', 'T1', 40),
    report('big', 'rss_openai', 'T1', 55),
    report('big', 'rss_techcrunch', 'T1.5'),
    report('big', 'hackernews', 'T2'),
    report('noofficial', 'a', 'T2'), report('noofficial', 'b', 'T2'), report('noofficial', 'c', 'T2'),
    report('small', 'rss_openai', 'T1'), report('small', 'hackernews', 'T2'),
  ];

  it('counts distinct sources and first-party presence per event', () => {
    const day = summariseDay(dayReports);
    expect(day.get('big')).toEqual({ sources: 3, official: true });
    expect(day.get('noofficial')).toEqual({ sources: 3, official: false });
    expect(day.get('small')).toEqual({ sources: 2, official: true });
  });

  it('adds only uncovered events with a first-party report and 3+ sources, represented by the best first-party report', () => {
    const day = summariseDay(dayReports);
    const picked = pickSupplements(dayReports, [], day);
    expect(picked).toHaveLength(1);
    expect(picked[0]).toMatchObject({ clusterKey: 'big', source: 'rss_openai', qualityScore: 55 });
  });

  it('skips events already among the candidates', () => {
    const day = summariseDay(dayReports);
    expect(pickSupplements(dayReports, [it_({ clusterKey: 'big' })], day)).toEqual([]);
  });
});

describe('isFirstParty', () => {
  it('counts official T1 feeds but not preprint servers, paper digests or media', () => {
    expect(isFirstParty({ source: 'rss_openai', sourceTier: 'T1' })).toBe(true);
    expect(isFirstParty({ source: 'twitter_openai', sourceTier: 'T1' })).toBe(true);
    expect(isFirstParty({ source: 'rss_arxiv_cl', sourceTier: 'T1' })).toBe(false);
    expect(isFirstParty({ source: 'rss_hf_papers', sourceTier: 'T1' })).toBe(false);
    expect(isFirstParty({ source: 'rss_mit_tech', sourceTier: 'T1' })).toBe(false);
    expect(isFirstParty({ source: 'rss_techcrunch', sourceTier: 'T1.5' })).toBe(false);
  });
});
