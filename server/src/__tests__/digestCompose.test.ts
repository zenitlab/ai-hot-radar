import { describe, it, expect } from 'vitest';
import {
  composeDigestItems, MAIN_SIZE, BRIEF_SIZE, PER_SOURCE_CAP, type ComposeItem,
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
