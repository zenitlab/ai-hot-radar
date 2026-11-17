import { describe, it, expect } from 'vitest';
import {
  REWRITE_COOLDOWN_MS,
  buildStoryDigestMessages,
  parseStoryDigest,
  pickReports,
  readStoryPoints,
  storiesNeedingDigest,
  type StoryReport,
} from '../utils/story-digest.js';

const report = (over: Partial<StoryReport>): StoryReport => ({
  title: 'Anthropic releases Claude Code v2.1.159',
  content: 'Anthropic released Claude Code v2.1.159 with faster startup.',
  source: 'rss_anthropic',
  sourceTier: 'T2',
  createdAt: new Date('2026-11-10T00:00:00Z'),
  ...over,
});

describe('pickReports', () => {
  it('keeps first-party reports when there are too many, in time order', () => {
    const media = Array.from({ length: 10 }, (_, i) =>
      report({ source: `media_${i}`, createdAt: new Date(Date.UTC(2026, 10, 10, i)) }));
    const official = report({ source: 'official', sourceTier: 'T1', createdAt: new Date('2026-11-11T00:00:00Z') });
    const picked = pickReports([...media, official]);
    expect(picked).toHaveLength(8);
    expect(picked.at(-1)?.source).toBe('official');
  });
});

describe('buildStoryDigestMessages', () => {
  it('prefers the summary over raw content and marks first-party sources', () => {
    const [, user] = buildStoryDigestMessages([
      report({ summary: '摘要内容', sourceTier: 'T1', authorName: 'Anthropic' }),
    ]);
    expect(user.content).toContain('摘要内容');
    expect(user.content).toContain('来源：Anthropic（官方或一手来源）');
  });
});

describe('parseStoryDigest', () => {
  const items = [report({}), report({ source: 'media', content: 'The update cuts startup time by half, Anthropic says.' })];
  const good = 'Anthropic 发布 Claude Code v2.1.159，主要改进是启动速度。Anthropic 称启动时间缩短一半，其他报道未给出独立测试数据。';

  it('accepts an overview grounded in the reports', () => {
    const out = parseStoryDigest(JSON.stringify({ title: 'Claude Code v2.1.159 发布', digest: good }), items);
    expect(out).toEqual({ title: 'Claude Code v2.1.159 发布', digest: good, points: null });
  });

  it('rejects an overview naming something no report mentions', () => {
    expect(parseStoryDigest(JSON.stringify({ title: 't', digest: `${good}同时发布了 Claude Opus 5。` }), items)).toBeNull();
  });

  it('keeps the overview but drops a title it cannot trust', () => {
    const out = parseStoryDigest(JSON.stringify({ title: 'Claude Opus 5 发布', digest: good }), items);
    expect(out).toEqual({ title: '', digest: good, points: null });
  });

  it('rejects unparseable or too-short output', () => {
    expect(parseStoryDigest('抱歉，我无法完成', items)).toBeNull();
    expect(parseStoryDigest(JSON.stringify({ title: 'x', digest: '太短' }), items)).toBeNull();
  });

  it('caps paragraphs at three and strips years the reports do not state', () => {
    const digest = ['2026年11月，Anthropic 发布 Claude Code v2.1.159，启动更快。', '第二段讲背景。', '第三段讲影响。', '第四段多余。'].join('\n\n');
    const out = parseStoryDigest(JSON.stringify({ title: '', digest }), items);
    expect(out?.digest.split('\n\n')).toHaveLength(3);
    expect(out?.digest.startsWith('11月')).toBe(true);
  });
});

describe('parseStoryDigest meta commentary', () => {
  const items = [report({}), report({ source: 'media' })];
  const fact = 'Anthropic 发布 Claude Code v2.1.159，主要改进是启动速度，Anthropic 称启动时间明显缩短。';

  it('drops sentences about the reporting itself', () => {
    const out = parseStoryDigest(JSON.stringify({ title: '', digest: `${fact}目前报道未披露定价和可用地域。` }), items);
    expect(out?.digest).toBe(fact);
  });

  it('rejects an overview that is nothing but meta commentary', () => {
    const digest = 'Anthropic 发布新版本。提供的报道素材仅包含标题信息，未披露具体功能，目前尚无法确认其技术细节与实际效果。';
    expect(parseStoryDigest(JSON.stringify({ title: '', digest }), items)).toBeNull();
  });
});

describe('storiesNeedingDigest', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  const old = new Date(now - REWRITE_COOLDOWN_MS - 1);
  const recent = new Date(now - 60_000);

  it('puts stories without an overview first, then ones that gained a source', () => {
    const stories = [
      { clusterKey: 'grown', sourceCount: 4 },
      { clusterKey: 'same', sourceCount: 2 },
      { clusterKey: 'new', sourceCount: 2 },
    ];
    const existing = [
      { clusterKey: 'grown', sourceCount: 3, updatedAt: old },
      { clusterKey: 'same', sourceCount: 2, updatedAt: old },
    ];
    expect(storiesNeedingDigest(stories, existing, 5, now)).toEqual(['new', 'grown']);
    expect(storiesNeedingDigest(stories, existing, 1, now)).toEqual(['new']);
  });

  it('waits out the cooldown before rewriting', () => {
    const existing = [{ clusterKey: 'a', sourceCount: 2, updatedAt: recent }];
    expect(storiesNeedingDigest([{ clusterKey: 'a', sourceCount: 5 }], existing, 5, now)).toEqual([]);
  });

});

describe('parseStoryDigest points', () => {
  const items = [report({}), report({ source: 'media', authorName: 'The Verge', content: 'The update cuts startup time by half, Anthropic says.' })];
  const good = 'Anthropic 发布 Claude Code v2.1.159，主要改进是启动速度。Anthropic 称启动时间缩短一半，其他报道未给出独立测试数据。';

  it('sorts facts into confirmed / unconfirmed / why and drops the ones it cannot trust', () => {
    const out = parseStoryDigest(
      JSON.stringify({
        title: '',
        digest: good,
        confirmed: [
          '- Anthropic 发布 Claude Code v2.1.159，主打启动速度',
          'Anthropic 同时发布 Claude Opus 5', // names something no report mentions
          '报道未披露定价细节', // a gap in the reporting, not a fact
        ],
        unconfirmed: ['据 The Verge 称启动时间缩短一半', '启动时间缩短一半'], // second has no attribution
        why: ['开发者日常启动等待更短', '这是 AI 编程的里程碑'], // second is puffery
      }),
      items,
    );
    expect(out?.points).toEqual({
      confirmed: ['Anthropic 发布 Claude Code v2.1.159，主打启动速度'],
      unconfirmed: ['据 The Verge 称启动时间缩短一半'],
      why: ['开发者日常启动等待更短'],
    });
  });

  it('drops all points when nothing is confirmed', () => {
    const out = parseStoryDigest(JSON.stringify({ title: '', digest: good, confirmed: [], unconfirmed: ['据 The Verge 称启动时间缩短一半'] }), items);
    expect(out?.points).toBeNull();
  });
});

describe('readStoryPoints', () => {
  it('reads stored points and tolerates old rows and bad JSON', () => {
    expect(readStoryPoints(JSON.stringify({ confirmed: ['a 发布了 b'], unconfirmed: [1], why: [] }))).toEqual({
      confirmed: ['a 发布了 b'],
      unconfirmed: [],
      why: [],
    });
    expect(readStoryPoints(null)).toBeNull();
    expect(readStoryPoints('{oops')).toBeNull();
  });
});
