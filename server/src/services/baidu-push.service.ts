import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Baidu 普通收录 API push: tells Baidu about new or changed URLs. Baidu doesn't
 * take part in IndexNow, and its index also feeds 文心 answers.
 *
 * Token comes from 搜索资源平台 → 普通收录 → API提交 and acts as a password,
 * so it only ever lives in the server env (BAIDU_PUSH_TOKEN).
 *
 * Baidu cuts the daily quota for sites that keep resubmitting old links, so
 * only URLs whose fingerprint changed are sent, and never more than the
 * remaining quota Baidu reported on the previous call.
 */
const ENDPOINT = 'http://data.zz.baidu.com/urls';
/** Baidu accepts up to 2000 URLs per request. */
const MAX_PER_REQUEST = 2000;
/**
 * Batch size while today's quota is still unknown. New sites get 10/day, and
 * Baidu rejects the whole request with `over quota` when a batch is larger
 * than what's left, so probe small and let the reported `remain` size later
 * batches.
 */
const FIRST_BATCH = 10;

@Injectable()
export class BaiduPushService {
  private readonly logger = new Logger(BaiduPushService.name);
  private readonly token = process.env.BAIDU_PUSH_TOKEN || '';
  private readonly siteUrl = (process.env.SITE_URL || 'https://aihotradar.com').replace(/\/+$/, '');
  /** url -> fingerprint last accepted by Baidu. */
  private readonly submitted = new Map<string, string>();
  /** Quota left today as reported by Baidu; null until the first response. */
  private remain: number | null = null;
  private remainDay = '';

  get enabled(): boolean {
    return Boolean(this.token);
  }

  /** Submit URLs whose fingerprint changed since last accepted. Never throws. */
  async submitChanged(entries: Array<{ url: string; fingerprint: string }>): Promise<number> {
    if (!this.enabled) return 0;

    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.remainDay) {
      this.remain = null; // quota resets daily
      this.remainDay = today;
    }

    const changed = entries.filter((e) => this.submitted.get(e.url) !== e.fingerprint);
    if (changed.length === 0) return 0;
    if (this.remain === 0) {
      this.logger.warn(`Baidu push: daily quota used up, ${changed.length} URL(s) wait for tomorrow`);
      return 0;
    }

    const cap = Math.min(MAX_PER_REQUEST, this.remain ?? FIRST_BATCH);
    const batch = changed.slice(0, cap);
    try {
      // `site` must go out unencoded, exactly as shown in the 搜索资源平台 sample
      // URL: Baidu answers `site init fail` to `https%3A%2F%2F...`.
      const res = await axios.post(
        `${ENDPOINT}?site=${this.siteUrl}&token=${encodeURIComponent(this.token)}`,
        batch.map((e) => e.url).join('\n'),
        { timeout: 15_000, headers: { 'Content-Type': 'text/plain' }, validateStatus: () => true },
      );
      const data = (res.data ?? {}) as { success?: number; remain?: number; not_same_site?: string[]; not_valid?: string[]; message?: string };
      if (res.status === 200 && typeof data.success === 'number') {
        const rejected = new Set([...(data.not_same_site ?? []), ...(data.not_valid ?? [])]);
        for (const e of batch) if (!rejected.has(e.url)) this.submitted.set(e.url, e.fingerprint);
        if (typeof data.remain === 'number') this.remain = data.remain;
        this.logger.log(`Baidu push: ${data.success} accepted, ${rejected.size} rejected, ${data.remain ?? '?'} left today`);
        return data.success;
      }
      if (data.message === 'over quota') this.remain = 0;
      this.logger.warn(`Baidu push: HTTP ${res.status} ${data.message ?? JSON.stringify(res.data).slice(0, 200)}`);
    } catch (err) {
      this.logger.warn(`Baidu push: request failed: ${err instanceof Error ? err.message : err}`);
    }
    return 0;
  }
}
