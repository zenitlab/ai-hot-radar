import { Injectable, Logger } from '@nestjs/common';
import { RedditSubredditConfig, REDDIT_SUBREDDITS } from '../rss-feeds/feeds.config';

/** A single Reddit post mapped to our internal schema */
export interface RedditPost {
  title: string;
  /** Self-text for text posts; empty string for link posts */
  content: string;
  /** Always the Reddit post permalink (https://reddit.com/r/.../comments/...) */
  url: string;
  /** For link posts: the external URL the post links to */
  externalUrl?: string;
  publishedAt: Date;
  subredditConfig: RedditSubredditConfig;
  /** Reddit post ID (base36) */
  sourceId: string;
  /** Net upvotes */
  score: number;
  commentCount: number;
  author?: string;
}

/** Shape of a single child in Reddit's JSON API listing response */
interface RedditApiPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  is_self: boolean;
  stickied: boolean;
  over_18: boolean;
  removed_by_category: string | null;
  // present when post is removed/deleted
  selftext_html?: string | null;
}

/** Queue-based rate limiter — guarantees true serial execution regardless of
 *  how many callers invoke wait() concurrently. Each call chains onto the
 *  previous promise and waits minIntervalMs after the last request started. */
class RateLimiter {
  private queue: Promise<void> = Promise.resolve();
  constructor(private readonly minIntervalMs: number = 600) {}

  wait(): Promise<void> {
    // Each caller chains onto the queue; the current slot resolves after
    // minIntervalMs, giving the *next* slot a natural delay.
    const next = this.queue.then(
      () => new Promise<void>(resolve => setTimeout(resolve, this.minIntervalMs)),
    );
    this.queue = next;
    return this.queue.then(() => { /* caller may proceed */ });
  }
}

@Injectable()
export class RedditService {
  private readonly logger = new Logger(RedditService.name);
  // 600ms between requests → stays well below Reddit's 60 req/min public limit
  private readonly limiter = new RateLimiter(600);

  /**
   * Fetch posts from a single subreddit using Reddit's public JSON API.
   * No authentication required; uses a descriptive User-Agent as per Reddit
   * API guidelines.
   */
  async fetchSubreddit(config: RedditSubredditConfig): Promise<RedditPost[]> {
    await this.limiter.wait();

    const url =
      `https://www.reddit.com/r/${config.subreddit}/${config.sortMode}.json` +
      `?limit=${config.limit}&raw_json=1`;

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'AI-Hot-Radar/1.0 (news aggregator; contact: github.com/zenitlab/ai-hot-radar)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(8000), // 8 s timeout per request
      });

      if (res.status === 429) {
        this.logger.warn(`Reddit rate-limited for r/${config.subreddit}, backing off 30s`);
        await new Promise(resolve => setTimeout(resolve, 30_000));
        return [];
      }

      if (!res.ok) {
        this.logger.warn(`Reddit fetch failed for r/${config.subreddit}: HTTP ${res.status}`);
        return [];
      }

      const json = await res.json() as {
        data?: { children?: Array<{ data: RedditApiPost }> };
      };

      const children = json?.data?.children ?? [];
      const posts: RedditPost[] = [];

      for (const { data: post } of children) {
        // Skip stickied mod posts, NSFW content, deleted/removed posts, and bots
        if (post.stickied) continue;
        if (post.over_18) continue;
        if (post.removed_by_category) continue;
        if (post.author === '[deleted]' || post.author === 'AutoModerator') continue;
        if (post.score < config.minScore) continue;

        // Filter out empty deleted self-posts
        const selftext = (post.selftext || '').trim();
        if (post.is_self && (selftext === '[deleted]' || selftext === '[removed]')) continue;

        // Decode HTML entities in both title and body (Reddit API returns &amp; etc.)
        const decodeEntities = (s: string) =>
          s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

        // Link posts: title is the description; text posts: use body
        const content = post.is_self
          ? decodeEntities(selftext).slice(0, 800)
          : decodeEntities(post.title);

        posts.push({
          title: decodeEntities(post.title),
          content,
          url: `https://reddit.com${post.permalink}`,
          externalUrl: !post.is_self ? post.url : undefined,
          publishedAt: new Date(post.created_utc * 1000),
          subredditConfig: config,
          sourceId: post.id,
          score: post.score,
          commentCount: post.num_comments,
          author: post.author,
        });
      }

      this.logger.log(`r/${config.subreddit}: fetched ${posts.length} posts (from ${children.length} raw)`);
      return posts;

    } catch (err) {
      this.logger.warn(
        `Failed to fetch r/${config.subreddit}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }
  }

  /** Fetch all configured subreddits concurrently (rate-limiter serialises the HTTP calls) */
  async fetchAllSubreddits(configs: RedditSubredditConfig[] = REDDIT_SUBREDDITS): Promise<RedditPost[]> {
    const results = await Promise.allSettled(configs.map(c => this.fetchSubreddit(c)));

    const posts: RedditPost[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') posts.push(...result.value);
    }

    this.logger.log(`Reddit total: ${posts.length} posts from ${configs.length} subreddits`);
    return posts;
  }
}
