import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import Parser from 'rss-parser';
import { RSS_FEEDS, RssFeedConfig } from '../rss-feeds/feeds.config';
import { FeedScheduler } from '../utils/feed-schedule';

export interface RssItem {
  title: string;
  content: string;
  url: string;
  publishedAt: Date | undefined;
  feedConfig: RssFeedConfig;
}

/** 5s timed out on slow feeds every day; AIHOT uses 20s. */
const FETCH_TIMEOUT_MS = 20_000;
/** Cap remembered URLs per feed; feeds only expose their latest few dozen items anyway. */
const SEEN_PER_FEED = 500;

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser = new Parser();
  private readonly scheduler = new FeedScheduler();
  /** URLs seen per feed, to count genuinely new items for the adaptive interval. */
  private readonly seen = new Map<string, Set<string>>();

  /**
   * Fetch a single RSS feed, returns empty array on failure or when not modified.
   * Uses ETag / Last-Modified so unchanged feeds answer 304 without a body.
   */
  async fetchFeed(config: RssFeedConfig, maxItems = 20): Promise<RssItem[]> {
    try {
      const res = await axios.get<string>(config.url, {
        timeout: FETCH_TIMEOUT_MS,
        responseType: 'text',
        headers: { 'User-Agent': 'AI-Hot-Radar-RSS-Reader/1.0', ...this.scheduler.conditionalHeaders(config.url) },
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      });
      const etag = res.headers['etag'] as string | undefined;
      const lastModified = res.headers['last-modified'] as string | undefined;

      if (res.status === 304) {
        this.scheduler.recordSuccess(config.url, { etag, lastModified, newItems: 0 });
        return [];
      }

      const feed = await this.parser.parseString(res.data);
      const entries = (feed.items || []).slice(0, maxItems);
      const items = entries.map((item) => ({
        title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
        content: (item.contentSnippet || item.content || item.summary || '').slice(0, 800),
        url: item.link || item.guid || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        feedConfig: config,
      })).filter((item) => item.title && item.url);

      this.scheduler.recordSuccess(config.url, { etag, lastModified, newItems: this.countNew(config.url, items) });
      return items;
    } catch (err) {
      this.scheduler.recordFailure(config.url);
      this.logger.warn(`Failed to fetch RSS feed [${config.name}]: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /** Fetch every feed that is due, concurrently. Quiet or failing feeds are skipped until due. */
  async fetchAllFeeds(maxItemsPerFeed = 20): Promise<RssItem[]> {
    const due = RSS_FEEDS.filter((config) => this.scheduler.isDue(config.url));
    const results = await Promise.allSettled(
      due.map((config) => this.fetchFeed(config, maxItemsPerFeed)),
    );

    const items: RssItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      }
    }

    this.logger.log(`Fetched ${items.length} RSS items from ${due.length}/${RSS_FEEDS.length} due feeds`);
    return items;
  }

  private countNew(feedUrl: string, items: RssItem[]): number {
    let set = this.seen.get(feedUrl);
    const firstFetch = !set;
    if (!set) {
      set = new Set();
      this.seen.set(feedUrl, set);
    }
    let fresh = 0;
    for (const it of items) {
      if (set.has(it.url)) continue;
      set.add(it.url);
      fresh++;
    }
    while (set.size > SEEN_PER_FEED) set.delete(set.values().next().value as string);
    // The first fetch's backlog isn't "output", or every feed would look busy after a restart.
    return firstFetch ? 0 : fresh;
  }
}
