import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { IndexNowService } from '../services/indexnow.service.js';

describe('IndexNowService', () => {
  beforeEach(() => {
    process.env.INDEXNOW_ENABLED = 'true';
    process.env.SITE_URL = 'https://example.com';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.INDEXNOW_ENABLED;
    delete process.env.SITE_URL;
  });

  it('builds absolute URLs from paths', () => {
    expect(new IndexNowService().url('/story/abc')).toBe('https://example.com/story/abc');
  });

  it('submits only URLs whose fingerprint changed', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: '' } as never);
    const svc = new IndexNowService();
    const a = { url: 'https://example.com/a', fingerprint: '1' };
    const b = { url: 'https://example.com/b', fingerprint: '1' };

    expect(await svc.submitChanged([a, b])).toBe(2);
    expect(await svc.submitChanged([a, b])).toBe(0);
    expect(await svc.submitChanged([a, { ...b, fingerprint: '2' }])).toBe(1);

    expect(post).toHaveBeenCalledTimes(2);
    const body = post.mock.calls[0][1] as { host: string; keyLocation: string; urlList: string[] };
    expect(body.host).toBe('example.com');
    expect(body.keyLocation).toMatch(/^https:\/\/example\.com\/[0-9a-f]+\.txt$/);
    expect(body.urlList).toEqual([a.url, b.url]);
  });

  it('does not mark URLs as sent when the engine rejects them', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 403, data: 'bad key' } as never);
    const svc = new IndexNowService();
    const a = { url: 'https://example.com/a', fingerprint: '1' };
    expect(await svc.submitChanged([a])).toBe(0);
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: '' } as never);
    expect(await svc.submitChanged([a])).toBe(1);
  });

  it('sends nothing when disabled', async () => {
    delete process.env.INDEXNOW_ENABLED;
    const post = vi.spyOn(axios, 'post');
    expect(await new IndexNowService().submitChanged([{ url: 'https://example.com/a', fingerprint: '1' }])).toBe(0);
    expect(post).not.toHaveBeenCalled();
  });
});
