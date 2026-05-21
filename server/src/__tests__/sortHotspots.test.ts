import { describe, it, expect } from 'vitest';
import { sortHotspots, calcHotScore, compareImportance, IMPORTANCE_ORDER } from '../utils/sortHotspots.js';
import type { SortableHotspot } from '../utils/sortHotspots.js';

// ========== 测试数据工厂 ==========

function makeHotspot(overrides: Partial<SortableHotspot> = {}): SortableHotspot {
  return {
    likeCount: 0,
    retweetCount: 0,
    viewCount: 0,
    importance: 'medium',
    relevance: 50,
    publishedAt: '2026-02-25T10:00:00Z',
    createdAt: '2026-02-25T12:00:00Z',
    ...overrides,
  };
}

// ========== calcHotScore 单元测试 ==========

describe('calcHotScore', () => {
  it('纯点赞计分：likeCount * 10', () => {
    const item = makeHotspot({ likeCount: 100, retweetCount: 0, viewCount: 0 });
    // views=0 → log10(max(0,1))=0, 所以热度=100*10=1000
    expect(calcHotScore(item)).toBeCloseTo(1000, 0);
  });

  it('纯转发计分：retweetCount * 5', () => {
    const item = makeHotspot({ likeCount: 0, retweetCount: 100, viewCount: 0 });
    expect(calcHotScore(item)).toBeCloseTo(500, 0);
  });

  it('浏览量使用 log10 缩放，不会淹没互动指标', () => {
    // 场景：561 likes + 10M views vs 11611 likes + 100K views
    // 旧公式 (viewCount * 0.01): 561*3 + 10000000*0.01 = 101683 vs 11611*3 + 100000*0.01 = 35833
    // 旧公式错误地让 561 likes 排在 11611 likes 前面
    const lowLikesHighViews = makeHotspot({ likeCount: 561, retweetCount: 0, viewCount: 10_000_000 });
    const highLikesLowViews = makeHotspot({ likeCount: 11611, retweetCount: 0, viewCount: 100_000 });

    const scoreLow = calcHotScore(lowLikesHighViews);
    const scoreHigh = calcHotScore(highLikesLowViews);

    // 11611 likes 的帖子应该得分更高
    expect(scoreHigh).toBeGreaterThan(scoreLow);
  });

  it('浏览量为 null 时安全处理', () => {
    const item = makeHotspot({ likeCount: 100, viewCount: null });
    expect(calcHotScore(item)).toBeCloseTo(1000, 0);
  });

  it('所有指标为 null 时返回 0', () => {
    const item = makeHotspot({ likeCount: null, retweetCount: null, viewCount: null });
    expect(calcHotScore(item)).toBeCloseTo(0, 0);
  });

  it('综合评分：点赞 + 转发 + 浏览 正确加权', () => {
    const item = makeHotspot({ likeCount: 1000, retweetCount: 200, viewCount: 1_000_000 });
    // 1000*10 + 200*5 + log10(1000000)*2 = 10000 + 1000 + 12 = 11012
    expect(calcHotScore(item)).toBeCloseTo(11012, 0);
  });
});

// ========== compareImportance 单元测试 ==========

describe('compareImportance', () => {
  it('urgent < high < medium < low (数值递增)', () => {
    expect(IMPORTANCE_ORDER['urgent']).toBeLessThan(IMPORTANCE_ORDER['high']);
    expect(IMPORTANCE_ORDER['high']).toBeLessThan(IMPORTANCE_ORDER['medium']);
    expect(IMPORTANCE_ORDER['medium']).toBeLessThan(IMPORTANCE_ORDER['low']);
  });

  it('urgent vs low 返回负数（urgent 更重要）', () => {
    const a = makeHotspot({ importance: 'urgent' });
    const b = makeHotspot({ importance: 'low' });
    expect(compareImportance(a, b)).toBeLessThan(0);
  });

  it('相同重要程度返回 0', () => {
    const a = makeHotspot({ importance: 'high' });
    const b = makeHotspot({ importance: 'high' });
    expect(compareImportance(a, b)).toBe(0);
  });

  it('未知重要程度的 fallback 值为 4', () => {
    const a = makeHotspot({ importance: 'unknown' as any });
    const b = makeHotspot({ importance: 'low' }); // low = 3
    expect(compareImportance(a, b)).toBeGreaterThan(0);
  });
});

// ========== sortHotspots 排序规则测试 ==========

describe('sortHotspots', () => {
  // ---------- 1. createdAt 排序 ----------
  describe('按创建时间排序 (createdAt)', () => {
    const items = [
      makeHotspot({ createdAt: '2026-02-25T10:00:00Z' }),
      makeHotspot({ createdAt: '2026-02-25T14:00:00Z' }),
      makeHotspot({ createdAt: '2026-02-25T08:00:00Z' }),
      makeHotspot({ createdAt: '2026-02-25T12:00:00Z' }),
    ];

    it('desc: 最新在前', () => {
      const sorted = sortHotspots(items, 'createdAt', 'desc');
      const times = sorted.map(h => h.createdAt);
      expect(times).toEqual([
        '2026-02-25T14:00:00Z',
        '2026-02-25T12:00:00Z',
        '2026-02-25T10:00:00Z',
        '2026-02-25T08:00:00Z',
      ]);
    });

    it('asc: 最旧在前', () => {
      const sorted = sortHotspots(items, 'createdAt', 'asc');
      const times = sorted.map(h => h.createdAt);
      expect(times).toEqual([
        '2026-02-25T08:00:00Z',
        '2026-02-25T10:00:00Z',
        '2026-02-25T12:00:00Z',
        '2026-02-25T14:00:00Z',
      ]);
    });

    it('不修改原数组', () => {
      const original = [...items];
      sortHotspots(items, 'createdAt', 'desc');
      expect(items).toEqual(original);
    });
  });

  // ---------- 2. publishedAt 排序 ----------
  describe('按发布时间排序 (publishedAt)', () => {
    it('desc: 最新发布的在前', () => {
      const items = [
        makeHotspot({ publishedAt: '2026-02-24T06:00:00Z', createdAt: '2026-02-25T10:00:00Z' }),
        makeHotspot({ publishedAt: '2026-02-25T12:00:00Z', createdAt: '2026-02-25T08:00:00Z' }),
        makeHotspot({ publishedAt: '2026-02-23T18:00:00Z', createdAt: '2026-02-25T06:00:00Z' }),
      ];
      const sorted = sortHotspots(items, 'publishedAt', 'desc');
      expect(sorted.map(h => h.publishedAt)).toEqual([
        '2026-02-25T12:00:00Z',
        '2026-02-24T06:00:00Z',
        '2026-02-23T18:00:00Z',
      ]);
    });

    it('publishedAt 为 null 的排在最后 (desc)', () => {
      const items = [
        makeHotspot({ publishedAt: null, createdAt: '2026-02-25T15:00:00Z' }),
        makeHotspot({ publishedAt: '2026-02-25T12:00:00Z', createdAt: '2026-02-25T10:00:00Z' }),
        makeHotspot({ publishedAt: null, createdAt: '2026-02-25T08:00:00Z' }),
      ];
      const sorted = sortHotspots(items, 'publishedAt', 'desc');
      // 有发布时间的排第一，null 的按 createdAt 兜底
      expect(sorted[0].publishedAt).toBe('2026-02-25T12:00:00Z');
      // 两个 null 的按 createdAt 排序
      expect(sorted[1].createdAt).toBe('2026-02-25T15:00:00Z');
      expect(sorted[2].createdAt).toBe('2026-02-25T08:00:00Z');
    });
  });

  // ---------- 3. importance 排序 ----------
  describe('按重要程度排序 (importance)', () => {
    const items = [
      makeHotspot({ importance: 'low', createdAt: '2026-02-25T10:00:00Z' }),
      makeHotspot({ importance: 'urgent', createdAt: '2026-02-25T09:00:00Z' }),
      makeHotspot({ importance: 'medium', createdAt: '2026-02-25T11:00:00Z' }),
      makeHotspot({ importance: 'high', createdAt: '2026-02-25T08:00:00Z' }),
      makeHotspot({ importance: 'urgent', createdAt: '2026-02-25T12:00:00Z' }),
    ];

    it('desc: 最重要在前 (urgent → high → medium → low)', () => {
      const sorted = sortHotspots(items, 'importance', 'desc');
      const importances = sorted.map(h => h.importance);
      expect(importances).toEqual(['urgent', 'urgent', 'high', 'medium', 'low']);
    });

    it('asc: 最不重要在前 (low → medium → high → urgent)', () => {
      const sorted = sortHotspots(items, 'importance', 'asc');
      const importances = sorted.map(h => h.importance);
      expect(importances).toEqual(['low', 'medium', 'high', 'urgent', 'urgent']);
    });

    it('相同重要程度时按创建时间倒序排列 (desc)', () => {
      const sorted = sortHotspots(items, 'importance', 'desc');
      // 两个 urgent 应按 createdAt desc 排列
      const urgents = sorted.filter(h => h.importance === 'urgent');
      expect(urgents[0].createdAt).toBe('2026-02-25T12:00:00Z');
      expect(urgents[1].createdAt).toBe('2026-02-25T09:00:00Z');
    });

    it('相同重要程度时按创建时间正序排列 (asc)', () => {
      const sorted = sortHotspots(items, 'importance', 'asc');
      const urgents = sorted.filter(h => h.importance === 'urgent');
      expect(urgents[0].createdAt).toBe('2026-02-25T09:00:00Z');
      expect(urgents[1].createdAt).toBe('2026-02-25T12:00:00Z');
    });
  });

  // ---------- 4. relevance 排序 ----------
  describe('按相关性排序 (relevance)', () => {
    const items = [
      makeHotspot({ relevance: 50 }),
      makeHotspot({ relevance: 95 }),
      makeHotspot({ relevance: 30 }),
      makeHotspot({ relevance: 85 }),
      makeHotspot({ relevance: 70 }),
    ];

    it('desc: 最高相关性在前', () => {
      const sorted = sortHotspots(items, 'relevance', 'desc');
      expect(sorted.map(h => h.relevance)).toEqual([95, 85, 70, 50, 30]);
    });

    it('asc: 最低相关性在前', () => {
      const sorted = sortHotspots(items, 'relevance', 'asc');
      expect(sorted.map(h => h.relevance)).toEqual([30, 50, 70, 85, 95]);
    });
  });

  // ---------- 5. hot 热度综合排序 ----------
  describe('按热度综合排序 (hot)', () => {
    it('desc: 热度最高在前', () => {
      const items = [
        makeHotspot({ likeCount: 100, retweetCount: 10, viewCount: 1000 }),   // 100*3+10*5+30=380
        makeHotspot({ likeCount: 5000, retweetCount: 500, viewCount: 50000 }), // 5000*3+500*5+47=17547
        makeHotspot({ likeCount: 10, retweetCount: 0, viewCount: 100 }),       // 10*3+0+20=50
      ];
      const sorted = sortHotspots(items, 'hot', 'desc');
      expect(sorted[0].likeCount).toBe(5000);
      expect(sorted[1].likeCount).toBe(100);
      expect(sorted[2].likeCount).toBe(10);
    });

    it('asc: 热度最低在前', () => {
      const items = [
        makeHotspot({ likeCount: 5000, retweetCount: 200, viewCount: 100000 }),
        makeHotspot({ likeCount: 10, retweetCount: 0, viewCount: 100 }),
        makeHotspot({ likeCount: 500, retweetCount: 50, viewCount: 10000 }),
      ];
      const sorted = sortHotspots(items, 'hot', 'asc');
      expect(sorted[0].likeCount).toBe(10);
      expect(sorted[1].likeCount).toBe(500);
      expect(sorted[2].likeCount).toBe(5000);
    });

    it('【核心修复验证】高点赞低浏览 > 低点赞高浏览', () => {
      // 这是截图中暴露的 bug：561 likes + 10M views 不应排在 11611 likes + 100K views 前面
      const items = [
        makeHotspot({ likeCount: 561, retweetCount: 0, viewCount: 10_000_000 }),   // 低点赞 高浏览
        makeHotspot({ likeCount: 11611, retweetCount: 0, viewCount: 100_000 }),     // 高点赞 低浏览
        makeHotspot({ likeCount: 39796, retweetCount: 0, viewCount: 5_000_000 }),   // 最高点赞
      ];

      const sorted = sortHotspots(items, 'hot', 'desc');

      // 39796 likes 应排第一
      expect(sorted[0].likeCount).toBe(39796);
      // 11611 likes 应排第二（不是 561）
      expect(sorted[1].likeCount).toBe(11611);
      // 561 likes 应排第三
      expect(sorted[2].likeCount).toBe(561);
    });

    it('null 互动数据等同于 0', () => {
      const items = [
        makeHotspot({ likeCount: null, retweetCount: null, viewCount: null }),
        makeHotspot({ likeCount: 100, retweetCount: 0, viewCount: 0 }),
      ];
      const sorted = sortHotspots(items, 'hot', 'desc');
      expect(sorted[0].likeCount).toBe(100);
      expect(sorted[1].likeCount).toBe(null);
    });

    it('转发权重高于点赞', () => {
      // 纯转发 100 vs 纯点赞 100: 转发得分 500 vs 点赞得分 1000
      // 新公式下点赞权重 > 转发权重
      const likes = makeHotspot({ likeCount: 100, retweetCount: 0, viewCount: 0 });
      const retweets = makeHotspot({ likeCount: 0, retweetCount: 100, viewCount: 0 });
      const sorted = sortHotspots([likes, retweets], 'hot', 'desc');
      expect(sorted[0].likeCount).toBe(100); // 点赞权重 10 > 转发权重 5，点赞在前
    });

    it('【截图场景验证】11774 likes 应排在 11611 likes 前面', () => {
      // 用户截图中：11,611 likes 排在 11,774 likes 前面，这是错的
      const items = [
        makeHotspot({ likeCount: 11611, retweetCount: 0, viewCount: 500_000 }),
        makeHotspot({ likeCount: 11774, retweetCount: 0, viewCount: 200_000 }),
      ];
      const sorted = sortHotspots(items, 'hot', 'desc');
      // 11774 likes > 11611 likes，即使浏览量少，点赞应主导排序
      expect(sorted[0].likeCount).toBe(11774);
      expect(sorted[1].likeCount).toBe(11611);
    });

    it('点赞是主导因素，浏览量差异不会翻转排名', () => {
      // 即使一条的浏览量是另一条的 100 倍，只要点赞差 200，排名不会翻转
      const moreLikes = makeHotspot({ likeCount: 1200, retweetCount: 0, viewCount: 10_000 });
      const moreViews = makeHotspot({ likeCount: 1000, retweetCount: 0, viewCount: 1_000_000 });
      const sorted = sortHotspots([moreViews, moreLikes], 'hot', 'desc');
      expect(sorted[0].likeCount).toBe(1200);
    });
  });

  // ---------- 边界情况 ----------
  describe('边界情况', () => {
    it('空数组返回空数组', () => {
      expect(sortHotspots([], 'createdAt', 'desc')).toEqual([]);
    });

    it('单元素数组保持不变', () => {
      const items = [makeHotspot({ relevance: 42 })];
      const sorted = sortHotspots(items, 'relevance', 'desc');
      expect(sorted.length).toBe(1);
      expect(sorted[0].relevance).toBe(42);
    });

    it('未知排序字段降级为 createdAt', () => {
      const items = [
        makeHotspot({ createdAt: '2026-02-25T14:00:00Z' }),
        makeHotspot({ createdAt: '2026-02-25T10:00:00Z' }),
      ];
      const sorted = sortHotspots(items, 'unknownField', 'desc');
      expect(sorted[0].createdAt).toBe('2026-02-25T14:00:00Z');
    });

    it('支持 Date 对象和 ISO 字符串混合', () => {
      const items = [
        makeHotspot({ createdAt: new Date('2026-02-25T14:00:00Z') }),
        makeHotspot({ createdAt: '2026-02-25T10:00:00Z' }),
        makeHotspot({ createdAt: new Date('2026-02-25T16:00:00Z') }),
      ];
      const sorted = sortHotspots(items, 'createdAt', 'desc');
      // 16:00 > 14:00 > 10:00
      expect(new Date(sorted[0].createdAt).getTime()).toBeGreaterThan(new Date(sorted[1].createdAt).getTime());
      expect(new Date(sorted[1].createdAt).getTime()).toBeGreaterThan(new Date(sorted[2].createdAt).getTime());
    });

    it('默认排序方向为 desc', () => {
      const items = [
        makeHotspot({ createdAt: '2026-02-25T10:00:00Z' }),
        makeHotspot({ createdAt: '2026-02-25T14:00:00Z' }),
      ];
      const sorted = sortHotspots(items, 'createdAt');
      expect(sorted[0].createdAt).toBe('2026-02-25T14:00:00Z');
    });
  });
});
