import { Injectable } from '@nestjs/common';
import type { SearchResult, Tweet, TwitterSearchResponse, TwitterFilterConfig, MediaItem } from '../types';

const TWITTER_API_BASE = 'https://api.twitterapi.io';

/** Map a tweet's extendedEntities.media to our MediaItem schema. */
function extractTweetMedia(tweet: Tweet): MediaItem[] | undefined {
  const raw = tweet.extendedEntities?.media;
  if (!raw || raw.length === 0) return undefined;
  const items: MediaItem[] = [];
  for (const m of raw) {
    if (m.type === 'photo') {
      items.push({
        type: 'photo',
        url: m.media_url_https,
        width: m.original_info?.width,
        height: m.original_info?.height,
      });
    } else if (m.type === 'video' || m.type === 'animated_gif') {
      // Pick the highest-bitrate MP4 variant; fall back to first variant.
      const mp4Variants = (m.video_info?.variants || []).filter(
        (v) => v.content_type === 'video/mp4' && v.url,
      );
      mp4Variants.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));
      const best = mp4Variants[0] || m.video_info?.variants?.[0];
      if (best?.url) {
        items.push({
          type: m.type === 'animated_gif' ? 'gif' : 'video',
          url: best.url,
          previewUrl: m.media_url_https,
          width: m.original_info?.width,
          height: m.original_info?.height,
        });
      } else if (m.media_url_https) {
        // Video metadata broken — fall back to showing the poster as a still
        items.push({ type: 'photo', url: m.media_url_https });
      }
    }
  }
  return items.length > 0 ? items : undefined;
}

class RateLimiter {
  private lastRequestTime = 0;
  constructor(private minInterval: number = 500) {}

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

@Injectable()
export class TwitterService {
  private readonly limiter = new RateLimiter(500); // serialize calls: 1 req per 500ms

  readonly filterConfig: TwitterFilterConfig = {
    minLikes: 10,
    minRetweets: 5,
    minViews: 500,
    minFollowers: 100,
    onlyOriginalTweets: true,
  };

  private filterAndRankTweets(tweets: Tweet[]): Tweet[] {
    const { minLikes, minRetweets, minViews, minFollowers } = this.filterConfig;

    const filtered = tweets.filter(tweet => {
      if (tweet.type && tweet.type.toLowerCase().includes('reply')) return false;
      if (/^@\w+\s/.test(tweet.text.trim())) return false;

      const factor = tweet.author.isBlueVerified ? 0.5 : 1;
      if (tweet.likeCount < minLikes * factor) return false;
      if (tweet.retweetCount < minRetweets * factor) return false;
      if (tweet.viewCount < minViews * factor) return false;
      if (tweet.author.followers < minFollowers * factor) return false;

      return true;
    });

    filtered.sort((a, b) => {
      const scoreA = a.likeCount * 2 + a.retweetCount * 3 + a.viewCount / 100 + (a.author.isBlueVerified ? 50 : 0);
      const scoreB = b.likeCount * 2 + b.retweetCount * 3 + b.viewCount / 100 + (b.author.isBlueVerified ? 50 : 0);
      return scoreB - scoreA;
    });

    return filtered;
  }

  private formatSinceDate(daysAgo: number): string {
    const d = new Date(Date.now() - daysAgo * 86400000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private buildAdvancedQuery(keyword: string, type: 'Top' | 'Latest'): string {
    const parts: string[] = [keyword];
    parts.push('-filter:retweets');
    parts.push('-filter:replies');
    const daysAgo = type === 'Top' ? 7 : 3;
    parts.push(`since:${this.formatSinceDate(daysAgo)}`);
    if (type === 'Top') parts.push('min_faves:10');
    return parts.join(' ');
  }

  private async makeTwitterRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const apiKey = process.env.TWITTER_API_KEY;
    if (!apiKey || apiKey.includes('your_') || apiKey === 'placeholder') {
      return { tweets: [] };
    }

    await this.limiter.wait();

    const url = new URL(`${TWITTER_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchTweetPage(
    query: string,
    queryType: 'Top' | 'Latest',
    cursor?: string,
  ): Promise<{ tweets: Tweet[]; nextCursor?: string }> {
    const data = (await this.makeTwitterRequest('/twitter/tweet/advanced_search', {
      query,
      queryType,
      ...(cursor ? { cursor } : {}),
    })) as TwitterSearchResponse;

    return {
      tweets: data.tweets && Array.isArray(data.tweets) ? data.tweets : [],
      nextCursor: data.has_next_page ? data.next_cursor : undefined,
    };
  }

  async searchTwitter(query: string): Promise<SearchResult[]> {
    try {
      const topQuery = this.buildAdvancedQuery(query, 'Top');
      const latestQuery = this.buildAdvancedQuery(query, 'Latest');

      console.log(`Twitter advanced queries:\n  Top: ${topQuery}\n  Latest: ${latestQuery}`);

      const [topPage1, latestPage1] = await Promise.allSettled([
        this.fetchTweetPage(topQuery, 'Top'),
        this.fetchTweetPage(latestQuery, 'Latest'),
      ]);

      const allTweets: Tweet[] = [];
      const seenIds = new Set<string>();

      const addTweets = (tweets: Tweet[]) => {
        for (const tweet of tweets) {
          if (!seenIds.has(tweet.id)) {
            seenIds.add(tweet.id);
            allTweets.push(tweet);
          }
        }
      };

      let topNextCursor: string | undefined;

      if (topPage1.status === 'fulfilled') {
        addTweets(topPage1.value.tweets);
        topNextCursor = topPage1.value.nextCursor;
      }
      if (latestPage1.status === 'fulfilled') {
        addTweets(latestPage1.value.tweets);
      }

      if (topNextCursor) {
        try {
          const topPage2 = await this.fetchTweetPage(topQuery, 'Top', topNextCursor);
          addTweets(topPage2.tweets);
        } catch (e) {
          console.warn('Twitter Top page 2 failed:', e);
        }
      }

      console.log(`Twitter: ${allTweets.length} unique tweets fetched`);

      const qualityTweets = this.filterAndRankTweets(allTweets);
      console.log(`Twitter: ${allTweets.length} → ${qualityTweets.length} after quality filter`);

      return qualityTweets.map((tweet: Tweet) => ({
        title: tweet.text.slice(0, 100),
        content: tweet.text,
        url: tweet.url,
        source: 'twitter' as const,
        sourceId: tweet.id,
        publishedAt: new Date(tweet.createdAt),
        viewCount: tweet.viewCount,
        likeCount: tweet.likeCount,
        retweetCount: tweet.retweetCount,
        replyCount: tweet.replyCount,
        quoteCount: tweet.quoteCount,
        media: extractTweetMedia(tweet),
        author: {
          name: tweet.author.name,
          username: tweet.author.userName,
          avatar: tweet.author.profilePicture,
          followers: tweet.author.followers,
          verified: tweet.author.isBlueVerified,
        },
      }));
    } catch (error) {
      console.error('Twitter search error:', error);
      return [];
    }
  }

  async getUserTweets(username: string): Promise<SearchResult[]> {
    try {
      const data = await this.makeTwitterRequest('/twitter/user/last_tweets', { userName: username });
      if (!data.tweets || !Array.isArray(data.tweets)) return [];

      return data.tweets.map((tweet: Tweet) => ({
        title: tweet.text.slice(0, 100),
        content: tweet.text,
        url: tweet.url,
        source: 'twitter' as const,
        sourceId: tweet.id,
        publishedAt: new Date(tweet.createdAt),
        viewCount: tweet.viewCount,
        likeCount: tweet.likeCount,
        retweetCount: tweet.retweetCount,
        replyCount: tweet.replyCount,
        quoteCount: tweet.quoteCount,
        media: extractTweetMedia(tweet),
        author: {
          name: tweet.author.name,
          username: tweet.author.userName,
          avatar: tweet.author.profilePicture,
          followers: tweet.author.followers,
          verified: tweet.author.isBlueVerified,
        },
      }));
    } catch (error) {
      console.error('Error fetching user tweets:', error);
      return [];
    }
  }

  async getTrends(woeid = 1): Promise<any[]> {
    try {
      const data = await this.makeTwitterRequest('/twitter/trends', { woeid: String(woeid) });
      return data.trends || [];
    } catch (error) {
      console.error('Error fetching trends:', error);
      return [];
    }
  }
}
