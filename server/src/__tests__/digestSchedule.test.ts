import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { DigestService } from '../digest/digest.service.js';

// @nestjs/schedule stores cron options under this metadata key on the method.
const CRON = 'SCHEDULE_CRON_OPTIONS';
const cronOf = (name: string) =>
  Reflect.getMetadata(CRON, (DigestService.prototype as unknown as Record<string, object>)[name]) as
    | { cronTime?: string }
    | undefined;

describe('digest schedule', () => {
  it('runs scheduledDigest at 08:05 and the fallback retry at 08:35 / 09:35', () => {
    expect(cronOf('scheduledDigest')?.cronTime).toBe('0 5 8 * * *');
    expect(cronOf('retryFallbackDigest')?.cronTime).toBe('0 35 8,9 * * *');
  });

  it('puts no cron on helpers that need arguments', () => {
    expect(cronOf('composeItems')).toBeUndefined();
    expect(cronOf('generateDigest')).toBeUndefined();
  });
});

describe('fallback digest', () => {
  const svc = new DigestService({} as never);
  const fallback = (items: unknown[]) =>
    (svc as unknown as { fallbackDigest: (i: unknown[], d: string) => import('../digest/digest.service.js').DigestData }).fallbackDigest(items, '2026-11-18');

  it('is flagged so the 08:35 / 09:35 retry picks it up', () => {
    expect(fallback([]).fallback).toBe(true);
  });

  it('only uses items that already have Chinese, and drops English summaries', () => {
    const data = fallback([
      { title: 'GPT-6.2 Astra and Sol', titleZh: null, summary: 'Today, we are releasing GPT-6.2.', source: 'hackernews', url: 'u1', region: 'international' },
      { title: 'Nvidia promises revenue', titleZh: 'Nvidia 称营收将继续攀升', summary: 'Nvidia says revenue keeps rising.', source: 'rss_techcrunch', url: 'u2', region: 'international' },
      { title: '阿里发布 Qwen4-Max 新模型', titleZh: null, summary: '阿里发布了 Qwen4-Max 新模型。', source: 'rss_ithome', url: 'u3', region: 'domestic' },
    ]);
    expect(data.highlights.map((h) => h.url)).toEqual(['u2', 'u3']);
    expect(data.highlights[0]).toMatchObject({ title: 'Nvidia 称营收将继续攀升', summary: '' });
    expect(data.highlights[1]).toMatchObject({ title: '阿里发布 Qwen4-Max 新模型', summary: '阿里发布了 Qwen4-Max 新模型。' });
    expect(data.summary).toContain('Nvidia 称营收将继续攀升');
  });
});
