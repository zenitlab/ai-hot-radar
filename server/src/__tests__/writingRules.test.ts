import { describe, it, expect } from 'vitest';
import { acceptTitleZh, cleanSummary, groundSummary, stripUnsupportedYears, unsupportedTerms } from '../utils/writing-rules.js';

describe('cleanSummary', () => {
  it('drops a leading label and a "本文介绍了" opener', () => {
    expect(cleanSummary('摘要：OpenAI 发布 GPT-5.6。')).toBe('OpenAI 发布 GPT-5.6。');
    expect(cleanSummary('本文介绍了 OpenAI 发布的 GPT-5.6。')).toBe('OpenAI 发布的 GPT-5.6。');
  });

  it('joins bullets and line breaks into one paragraph', () => {
    expect(cleanSummary('- 第一句。\n- 第二句。')).toBe('第一句。第二句。');
  });

  it('cuts at a sentence boundary instead of mid-sentence', () => {
    const s = `${'甲'.repeat(60)}。${'乙'.repeat(60)}。${'丙'.repeat(120)}。`;
    const out = cleanSummary(s, 150);
    expect(out.endsWith('。')).toBe(true);
    expect(out).not.toContain('丙');
  });
});

describe('stripUnsupportedYears', () => {
  it('removes a year the source never states', () => {
    expect(stripUnsupportedYears('2026年5月，OpenAI 发布新模型', 'OpenAI released a model in May')).toBe('5月，OpenAI 发布新模型');
  });

  it('keeps a year the source states', () => {
    expect(stripUnsupportedYears('2026年5月发布', 'Released May 2026')).toBe('2026年5月发布');
  });
});

describe('unsupportedTerms', () => {
  const source = 'Anthropic today released Claude Code v2.1.159 with GPT 5.6 comparison';

  it('accepts names from the source, ignoring spacing and hyphens', () => {
    expect(unsupportedTerms('Anthropic 发布 Claude Code v2.1.159，对比 GPT-5.6', source)).toEqual([]);
  });

  it('flags a name or version the source does not contain', () => {
    expect(unsupportedTerms('Anthropic 发布 Claude Opus 5', source)).toEqual(['Opus']);
    expect(unsupportedTerms('Claude Code v3.0 发布', source)).toEqual(['v3.0']);
  });

  it('ignores generic vocabulary and known company aliases', () => {
    expect(unsupportedTerms('AI Agent 的 API 更新', '一篇关于智能体的文章')).toEqual([]);
    expect(unsupportedTerms('Google 发布新模型', '谷歌今天发布了新模型')).toEqual([]);
  });
});

describe('acceptTitleZh', () => {
  const source = 'v2.1.159 Claude Code Releases bug fixes';

  it('measures length by reading width, so Latin product names count half', () => {
    const src = 'NVIDIA Vera Rubin NVL72 Achieves up to 2x Blackwell Ultra Performance in MLPerf Training v6.1';
    const title = 'NVIDIA Vera Rubin NVL72 在 MLPerf Training v6.1 中性能最高达 Blackwell Ultra 两倍';
    expect(title.length).toBeGreaterThan(60);
    expect(acceptTitleZh(title, src)).toBe(title);
    expect(acceptTitleZh('这'.repeat(61), '这'.repeat(61))).toBe('');
  });

  it('accepts a faithful Chinese title', () => {
    expect(acceptTitleZh('“Claude Code v2.1.159 发布”', source)).toBe('Claude Code v2.1.159 发布');
  });

  it('rejects a title naming something the source does not', () => {
    expect(acceptTitleZh('Anthropic 发布 Claude Opus 5', source)).toBe('');
  });

  it('rejects untranslated, empty or overlong output', () => {
    expect(acceptTitleZh('Claude Code Releases', source)).toBe('');
    expect(acceptTitleZh(undefined, source)).toBe('');
    expect(acceptTitleZh('发布'.repeat(40), source)).toBe('');
  });

  it('rejects a half-translated title but keeps lowercase product names', () => {
    expect(acceptTitleZh('Anthropic 发布 unpublished 全合成盲测', 'Anthropic unpublished total syntheses')).toBe('');
    expect(acceptTitleZh('llama.cpp 新版发布', 'llama.cpp release')).toBe('llama.cpp 新版发布');
  });
});

describe('groundSummary', () => {
  const summary = '美联航禁止 AI 代理代旅客订票。此举引发行业对自动化边界的讨论。新规本周生效。';

  it('keeps only the first sentence when the source is thin', () => {
    expect(groundSummary(summary, 'United bans AI agents', 120)).toBe('美联航禁止 AI 代理代旅客订票。');
  });

  it('drops stock filler sentences the source does not support', () => {
    expect(groundSummary(summary, 'United bans AI agents ... long article', 900)).toBe('美联航禁止 AI 代理代旅客订票。新规本周生效。');
  });

  it('keeps a filler phrase the source itself uses', () => {
    expect(groundSummary(summary, '此举引发行业对自动化边界的讨论', 900)).toBe(summary);
  });
});
