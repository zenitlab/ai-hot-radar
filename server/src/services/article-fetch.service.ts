import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import {
  detectCharset,
  extractArticleText,
  isBlockedAddress,
  isSafeRedirect,
  robotsAllows,
  shouldFetchArticle,
  unwrapTrackingUrl,
} from '../utils/article-extract';

/**
 * Fetches the article behind a feed item that came with only a headline, so
 * the scoring model reads the article instead of guessing from the title.
 *
 * - Never throws and never blocks scoring for long: any failure returns ''
 *   and the item is scored on what the feed gave.
 * - Respects robots.txt, identifies itself, and keeps a few requests in flight.
 * - Refuses private and metadata addresses at connect time, including after
 *   redirects, because feed URLs are not trustworthy.
 * - The text is used for scoring only and is not stored or shown on the site.
 *
 * ARTICLE_FETCH_ENABLED=false turns it off.
 */
const USER_AGENT = 'Mozilla/5.0 (compatible; AIHotRadar/1.0; +https://aihotradar.com/about)';
const ROBOTS_AGENT = 'AIHotRadar';
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_IN_FLIGHT = 4;
const ROBOTS_TTL_MS = 24 * 3600_000;
const RESULT_TTL_MS = 6 * 3600_000;
const LOG_EVERY = 50;

type Outcome = 'ok' | 'empty' | 'robots' | 'failed';

/** DNS lookup that refuses internal addresses; axios calls it for every connection, redirects included. */
function safeLookup(
  hostname: string,
  options: object,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '');
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => isBlockedAddress(a.address));
    if (bad || list.length === 0) {
      return callback(Object.assign(new Error(`blocked address for ${hostname}`), { code: 'EBLOCKED' }), '');
    }
    if ((options as { all?: boolean }).all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

@Injectable()
export class ArticleFetchService {
  private readonly logger = new Logger(ArticleFetchService.name);
  private readonly enabled = process.env.ARTICLE_FETCH_ENABLED !== 'false';
  private readonly robots = new Map<string, { txt: string; expires: number }>();
  private readonly results = new Map<string, { text: string; expires: number }>();
  private readonly inFlightByUrl = new Map<string, Promise<string>>();
  private inFlight = 0;
  private readonly queue: Array<() => void> = [];
  private stats: Record<Outcome, number> = { ok: 0, empty: 0, robots: 0, failed: 0 };

  /**
   * Article text for `url` when the feed's `content` is too thin to score
   * from, else ''. Callers use the result only if it is longer than what they have.
   */
  async enrich(url: string | undefined, content: string): Promise<string> {
    if (!this.enabled || !url) return '';
    const key = unwrapTrackingUrl(url);
    if (!shouldFetchArticle(key, content)) return '';
    const cached = this.results.get(key);
    if (cached && cached.expires > Date.now()) return cached.text;
    // Several keywords can surface the same URL in one round; fetch it once.
    const pending = this.inFlightByUrl.get(key);
    if (pending) return pending;

    const p = this.withSlot(() => this.fetchArticle(key)).finally(() => this.inFlightByUrl.delete(key));
    this.inFlightByUrl.set(key, p);
    return p;
  }

  private async fetchArticle(url: string): Promise<string> {
    let outcome: Outcome = 'failed';
    let text = '';
    try {
      const u = new URL(url);
      if (!(await this.allowedByRobots(u))) {
        outcome = 'robots';
      } else {
        const res = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          timeout: TIMEOUT_MS,
          maxContentLength: MAX_BYTES,
          maxRedirects: 3,
          lookup: safeLookup as never,
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' },
          validateStatus: (s) => s === 200,
          beforeRedirect: (options: Record<string, unknown>) => {
            if (!isSafeRedirect(String(options.protocol), String(options.hostname), String(options.port ?? ''))) {
              throw new Error('unsafe redirect');
            }
          },
        });
        const type = String(res.headers['content-type'] ?? '');
        if (/html/iu.test(type)) {
          const bytes = Buffer.from(res.data);
          const head = bytes.subarray(0, 2048).toString('latin1');
          let html: string;
          try {
            html = new TextDecoder(detectCharset(type, head)).decode(bytes);
          } catch {
            html = bytes.toString('utf8');
          }
          text = extractArticleText(html);
        }
        outcome = text ? 'ok' : 'empty';
      }
    } catch {
      outcome = 'failed';
    }
    this.record(outcome);
    // Failures are cached too, so a site that times out isn't hit again every round.
    this.results.set(url, { text, expires: Date.now() + RESULT_TTL_MS });
    this.prune();
    return text;
  }

  private async allowedByRobots(u: URL): Promise<boolean> {
    const origin = u.origin;
    let entry = this.robots.get(origin);
    if (!entry || entry.expires < Date.now()) {
      let txt = '';
      try {
        const res = await axios.get<string>(`${origin}/robots.txt`, {
          timeout: 5_000,
          maxContentLength: 512 * 1024,
          maxRedirects: 2,
          responseType: 'text',
          lookup: safeLookup as never,
          headers: { 'User-Agent': USER_AGENT },
          validateStatus: () => true,
        });
        // 4xx means "no rules"; 5xx means the site is struggling, so stay away (RFC 9309).
        if (res.status >= 500) txt = 'User-agent: *\nDisallow: /';
        else if (res.status === 200 && typeof res.data === 'string') txt = res.data;
      } catch {
        txt = 'User-agent: *\nDisallow: /';
      }
      entry = { txt, expires: Date.now() + ROBOTS_TTL_MS };
      this.robots.set(origin, entry);
    }
    return robotsAllows(entry.txt, ROBOTS_AGENT, `${u.pathname}${u.search}`);
  }

  private async withSlot<T>(fn: () => Promise<T>): Promise<T> {
    if (this.inFlight >= MAX_IN_FLIGHT) await new Promise<void>((resolve) => this.queue.push(resolve));
    this.inFlight++;
    try {
      return await fn();
    } finally {
      this.inFlight--;
      this.queue.shift()?.();
    }
  }

  private record(outcome: Outcome): void {
    this.stats[outcome]++;
    const total = Object.values(this.stats).reduce((a, b) => a + b, 0);
    if (total >= LOG_EVERY) {
      const s = this.stats;
      this.logger.log(`Article fetch: ${s.ok}/${total} ok (no article ${s.empty}, robots ${s.robots}, failed ${s.failed})`);
      this.stats = { ok: 0, empty: 0, robots: 0, failed: 0 };
    }
  }

  private prune(): void {
    if (this.results.size < 5000) return;
    const now = Date.now();
    for (const [k, v] of this.results) if (v.expires < now) this.results.delete(k);
    for (const [k, v] of this.robots) if (v.expires < now) this.robots.delete(k);
  }
}
