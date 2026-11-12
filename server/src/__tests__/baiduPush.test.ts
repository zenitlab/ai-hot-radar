import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BaiduPushService } from '../services/baidu-push.service.js';

const ok = (data: object) => ({ status: 200, data } as never);

describe('BaiduPushService', () => {
  beforeEach(() => {
    process.env.BAIDU_PUSH_TOKEN = 'tok';
    process.env.SITE_URL = 'https://example.com';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.BAIDU_PUSH_TOKEN;
    delete process.env.SITE_URL;
  });

  it('is disabled without a token and sends nothing', async () => {
    delete process.env.BAIDU_PUSH_TOKEN;
    const post = vi.spyOn(axios, 'post');
    const svc = new BaiduPushService();
    expect(svc.enabled).toBe(false);
    expect(await svc.submitChanged([{ url: 'https://example.com/a', fingerprint: '1' }])).toBe(0);
    expect(post).not.toHaveBeenCalled();
  });

  it('posts a newline-separated list and only resubmits changed URLs', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue(ok({ success: 2, remain: 98 }));
    const svc = new BaiduPushService();
    const a = { url: 'https://example.com/a', fingerprint: '1' };
    const b = { url: 'https://example.com/b', fingerprint: '1' };

    expect(await svc.submitChanged([a, b])).toBe(2);
    expect(post.mock.calls[0][0]).toContain('site=https%3A%2F%2Fexample.com&token=tok');
    expect(post.mock.calls[0][1]).toBe(`${a.url}\n${b.url}`);

    expect(await svc.submitChanged([a, b])).toBe(0);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('retries URLs Baidu rejected as invalid', async () => {
    const post = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce(ok({ success: 1, remain: 9, not_valid: ['https://example.com/b'] }))
      .mockResolvedValueOnce(ok({ success: 1, remain: 8 }));
    const svc = new BaiduPushService();
    const a = { url: 'https://example.com/a', fingerprint: '1' };
    const b = { url: 'https://example.com/b', fingerprint: '1' };
    await svc.submitChanged([a, b]);
    await svc.submitChanged([a, b]);
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toBe(b.url);
  });

  it('stops for the day once the quota is used up', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue(ok({ success: 1, remain: 0 }));
    const svc = new BaiduPushService();
    await svc.submitChanged([{ url: 'https://example.com/a', fingerprint: '1' }]);
    expect(await svc.submitChanged([{ url: 'https://example.com/b', fingerprint: '1' }])).toBe(0);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('caps a batch to the remaining quota', async () => {
    const post = vi.spyOn(axios, 'post')
      .mockResolvedValueOnce(ok({ success: 1, remain: 2 }))
      .mockResolvedValueOnce(ok({ success: 2, remain: 0 }));
    const svc = new BaiduPushService();
    await svc.submitChanged([{ url: 'https://example.com/x', fingerprint: '1' }]);
    const many = ['a', 'b', 'c', 'd'].map((k) => ({ url: `https://example.com/${k}`, fingerprint: '1' }));
    await svc.submitChanged(many);
    expect((post.mock.calls[1][1] as string).split('\n')).toHaveLength(2);
  });
});
