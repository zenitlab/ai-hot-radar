import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * IndexNow: tell Bing (and other participating engines: Yandex, Naver, Seznam…)
 * that a URL is new or changed, so it's crawled within minutes instead of days.
 * Bing's index feeds ChatGPT Search and Copilot. Baidu does not take part.
 *
 * Ownership is proven by a key file served at the site root
 * (client-next/public/<key>.txt containing the key). The key is public by
 * design, so it's safe to hard-code a default.
 *
 * Disabled unless INDEXNOW_ENABLED=true, so local dev never pings production.
 */
const DEFAULT_KEY = '7ee135d3ea5a15c99bc1ce9b8a457012';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** Protocol limit per request. */
const MAX_URLS = 10_000;

@Injectable()
export class IndexNowService {
  private readonly logger = new Logger(IndexNowService.name);
  private readonly enabled = process.env.INDEXNOW_ENABLED === 'true';
  private readonly key = process.env.INDEXNOW_KEY || DEFAULT_KEY;
  private readonly siteUrl = (process.env.SITE_URL || 'https://aihotradar.com').replace(/\/+$/, '');
  /** url -> fingerprint last submitted; only changed URLs are re-sent. */
  private readonly submitted = new Map<string, string>();

  /** Absolute URL for a site path, e.g. "/digest/2026-11-09". */
  url(path: string): string {
    return `${this.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /**
   * Submit URLs whose fingerprint changed since the last submission.
   * `entries` maps absolute URL -> fingerprint (e.g. lastmod). Never throws.
   */
  async submitChanged(entries: Array<{ url: string; fingerprint: string }>): Promise<number> {
    const changed = entries.filter((e) => this.submitted.get(e.url) !== e.fingerprint);
    if (changed.length === 0) return 0;
    if (!this.enabled) {
      this.logger.debug(`IndexNow disabled; would submit ${changed.length} URL(s)`);
      return 0;
    }

    const batch = changed.slice(0, MAX_URLS);
    try {
      const res = await axios.post(
        ENDPOINT,
        {
          host: new URL(this.siteUrl).host,
          key: this.key,
          keyLocation: `${this.siteUrl}/${this.key}.txt`,
          urlList: batch.map((e) => e.url),
        },
        { timeout: 15_000, headers: { 'Content-Type': 'application/json; charset=utf-8' }, validateStatus: () => true },
      );
      // 200 = accepted, 202 = accepted pending key validation.
      if (res.status === 200 || res.status === 202) {
        for (const e of batch) this.submitted.set(e.url, e.fingerprint);
        this.logger.log(`IndexNow: submitted ${batch.length} URL(s) (HTTP ${res.status})`);
        return batch.length;
      }
      this.logger.warn(`IndexNow: HTTP ${res.status} ${JSON.stringify(res.data).slice(0, 200)}`);
    } catch (err) {
      this.logger.warn(`IndexNow: request failed: ${err instanceof Error ? err.message : err}`);
    }
    return 0;
  }
}
