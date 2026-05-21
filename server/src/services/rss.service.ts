import { Injectable, Logger } from '@nestjs/common';
import Parser from 'rss-parser';
import { RSS_FEEDS, RssFeedConfig } from '../rss-feeds/feeds.config';

export interface RssItem {
  title: string;
  content: string;
  url: string;
  publishedAt: Date | undefined;
  feedConfig: RssFeedConfig;
}

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser = new Parser({
    timeout: 5000,
    headers: { 'User-Agent': 'AI-Hot-Radar-RSS-Reader/1.0' },
  });

  /** Fetch a single RSS feed, returns empty array on failure */
  async fetchFeed(config: RssFeedConfig, maxItems = 20): Promise<RssItem[]> {
    try {
      const feed = await this.parser.parseURL(config.url);
      const entries = (feed.items || []).slice(0, maxItems);

      return entries.map((item) => ({
        title: (item.title || '').replace(/<[^>]+>/g, '').trim(),
        content: (item.contentSnippet || item.content || item.summary || '').slice(0, 800),
        url: item.link || item.guid || '',
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        feedConfig: config,
      })).filter((item) => item.title && item.url);
    } catch (err) {
      this.logger.warn(`Failed to fetch RSS feed [${config.name}]: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  /** Fetch all configured RSS feeds concurrently */
  async fetchAllFeeds(maxItemsPerFeed = 20): Promise<RssItem[]> {
    const results = await Promise.allSettled(
      RSS_FEEDS.map((config) => this.fetchFeed(config, maxItemsPerFeed)),
    );

    const items: RssItem[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        items.push(...result.value);
      }
    }

    this.logger.log(`Fetched ${items.length} RSS items from ${RSS_FEEDS.length} feeds`);
    return items;
  }
}
