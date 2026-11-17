import { describe, it, expect } from 'vitest';
import { TOPICS, matchesTopic, topicPattern } from '../topics/topics.config.js';

const topic = (slug: string) => TOPICS.find((t) => t.slug === slug)!;

describe('topic config', () => {
  it('has unique, URL-safe slugs', () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});

describe('matchesTopic', () => {
  it('matches a company by headline only, not by tags', () => {
    expect(matchesTopic(topic('anthropic'), { title: 'Anthropic releases Claude Fable 5.2' })).toBe(true);
    expect(matchesTopic(topic('anthropic'), { title: 'Some news', tags: '["Anthropic"]' })).toBe(false);
    expect(matchesTopic(topic('openai'), { title: 'x', titleZh: 'OpenAI 发布 GPT-6' })).toBe(true);
  });

  it('matches Latin names as whole words only', () => {
    expect(matchesTopic(topic('meta'), { title: 'Meta releases Llama 5' })).toBe(true);
    expect(matchesTopic(topic('meta'), { title: 'Metadata extraction at scale' })).toBe(false);
    expect(matchesTopic(topic('apple'), { title: 'Pineapple AI startup raises' })).toBe(false);
    expect(matchesTopic(topic('openai'), { title: 'GPT-6 Astra benchmark' })).toBe(true);
  });

  it('matches a direction by headline or tags', () => {
    expect(matchesTopic(topic('agent'), { title: 'Some framework', tags: '["Agent","RAG"]' })).toBe(true);
    expect(matchesTopic(topic('coding'), { title: 'x', titleZh: 'Claude Code 新增后台任务' })).toBe(true);
    expect(matchesTopic(topic('inference'), { title: 'llama.cpp v1.0.0 released' })).toBe(true);
    expect(matchesTopic(topic('inference'), { title: '轻量化 Token 监控工具', tags: '["本地部署"]' })).toBe(false);
  });

  it('matches content types by category', () => {
    expect(matchesTopic(topic('research'), { title: 'x', category: 'research' })).toBe(true);
    expect(matchesTopic(topic('research'), { title: 'x', category: 'model' })).toBe(false);
  });

  it('treats spaces in a term as optional', () => {
    expect(topicPattern(['Claude Code']).test('ClaudeCode 更新')).toBe(true);
  });
});
