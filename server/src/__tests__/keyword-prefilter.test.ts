import { describe, it, expect } from 'vitest';
import { looksLikeNonNewsPage, titleLooksAiRelated, needsKeywordPrefilter } from '../utils/keyword-prefilter';

describe('looksLikeNonNewsPage', () => {
  it('blocks portal/login URLs', () => {
    expect(looksLikeNonNewsPage('https://partnerhub.anthropic.com/signin', 'Welcome to EULER!')).toBe(true);
    expect(looksLikeNonNewsPage('https://app.example.com/login', 'Sign In')).toBe(true);
    expect(looksLikeNonNewsPage('https://console.openai.com/dashboard', 'Dashboard')).toBe(true);
    expect(looksLikeNonNewsPage('https://hub.example.com/auth/', 'Auth Portal')).toBe(true);
  });

  it('blocks welcome/auth titles', () => {
    expect(looksLikeNonNewsPage('https://example.com/news', 'Welcome to EULER! - Anthropic')).toBe(true);
    expect(looksLikeNonNewsPage('https://example.com/page', 'Sign in to continue')).toBe(true);
    expect(looksLikeNonNewsPage('https://example.com/zh', '欢迎使用控制台')).toBe(true);
    expect(looksLikeNonNewsPage('https://example.com/zh', '登录您的账户')).toBe(true);
  });

  it('allows normal news URLs and titles', () => {
    expect(looksLikeNonNewsPage('https://www.anthropic.com/news/claude-opus', 'Anthropic Releases Claude Opus 4')).toBe(false);
    expect(looksLikeNonNewsPage('https://blog.openai.com/gpt5', 'OpenAI launches GPT-5')).toBe(false);
    expect(looksLikeNonNewsPage('https://news.example.com/ai-breakthrough', 'New AI breakthrough announced')).toBe(false);
  });
});

describe('titleLooksAiRelated', () => {
  it('matches AI keywords', () => {
    expect(titleLooksAiRelated('OpenAI 发布 GPT-5')).toBe(true);
    expect(titleLooksAiRelated('Anthropic Claude Opus reaches AGI')).toBe(true);
    expect(titleLooksAiRelated('大模型训练成本下降')).toBe(true);
  });

  it('rejects non-AI titles', () => {
    expect(titleLooksAiRelated('政策解读：经济形势分析')).toBe(false);
    expect(titleLooksAiRelated('Stock market updates for today')).toBe(false);
  });
});

describe('needsKeywordPrefilter', () => {
  it('returns true for generic news sources', () => {
    expect(needsKeywordPrefilter('ithome')).toBe(true);
    expect(needsKeywordPrefilter('36kr')).toBe(true);
  });

  it('returns false for AI-focused sources', () => {
    expect(needsKeywordPrefilter('openai')).toBe(false);
    expect(needsKeywordPrefilter('anthropic')).toBe(false);
  });
});
