import { describe, it, expect } from 'vitest';
import {
  tokenizeTitle,
  computeClusterKey,
  jaccardSimilarity,
} from '../utils/title-cluster.js';
import { resolveClusterKey, type ClusterClaim } from '../utils/authority.js';

describe('tokenizeTitle', () => {
  it('drops latin stopwords and short tokens', () => {
    const tokens = tokenizeTitle('The new OpenAI agent');
    expect(tokens).toContain('openai');
    expect(tokens).toContain('agent');
    expect(tokens).not.toContain('the');
    expect(tokens).not.toContain('new');
  });

  it('builds CJK character bigrams within runs', () => {
    const tokens = tokenizeTitle('开源代理');
    expect(tokens).toEqual(expect.arrayContaining(['开源', '源代', '代理']));
  });

  it('is order-independent as a set', () => {
    const a = new Set(tokenizeTitle('OpenAI 发布 编码代理'));
    const b = new Set(tokenizeTitle('编码代理 OpenAI 发布'));
    expect([...a].sort()).toEqual([...b].sort());
  });
});

describe('computeClusterKey (方案1)', () => {
  it('collapses reordered titles to the same key', () => {
    expect(computeClusterKey('OpenAI 发布编码代理'))
      .toBe(computeClusterKey('发布编码代理 OpenAI'));
  });

  it('separates unrelated titles', () => {
    expect(computeClusterKey('OpenAI 开源编码代理'))
      .not.toBe(computeClusterKey('微软发布 .NET 官方库'));
  });
});

describe('jaccardSimilarity', () => {
  it('is 1 for identical token sets and 0 for disjoint', () => {
    expect(jaccardSimilarity(['a', 'b'], ['a', 'b'])).toBe(1);
    expect(jaccardSimilarity(['a'], ['b'])).toBe(0);
  });
});

describe('resolveClusterKey (方案2)', () => {
  const claim = (tokens: string[]): ClusterClaim => ({ authority: 100, tokens });

  it('returns exact key when already claimed', () => {
    const claims = new Map([['k1', claim(['x', 'y', 'z', 'w'])]]);
    expect(resolveClusterKey(['anything'], 'k1', claims)).toBe('k1');
  });

  it('merges into a similar existing cluster above threshold', () => {
    const aTokens = tokenizeTitle('OpenAI 开源轻量级编码代理 codex');
    const bTokens = tokenizeTitle('OpenAI 开源轻量级编码代理工具 codex');
    const claims = new Map([['existing', claim(aTokens)]]);
    expect(resolveClusterKey(bTokens, 'newkey', claims)).toBe('existing');
  });

  it('does not merge dissimilar titles (keeps its own key)', () => {
    const aTokens = tokenizeTitle('OpenAI 开源轻量级编码代理 codex');
    const bTokens = tokenizeTitle('微软发布 .NET 官方机器学习库 release');
    const claims = new Map([['existing', claim(aTokens)]]);
    expect(resolveClusterKey(bTokens, 'newkey', claims)).toBe('newkey');
  });

  it('skips fuzzy matching for very short titles', () => {
    const claims = new Map([['existing', claim(tokenizeTitle('OpenAI 发布编码代理 codex'))]]);
    expect(resolveClusterKey(tokenizeTitle('codex'), 'newkey', claims)).toBe('newkey');
  });
});
