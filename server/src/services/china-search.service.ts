import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { SearchResult } from '../types';
import { withRetry } from '../utils/retry';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

class RateLimiter {
  private lastRequestTime = 0;
  constructor(private minInterval: number = 5000) {}

  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

export interface AccountInfo {
  platform: 'bilibili' | 'weibo';
  name: string;
  id: string;
  followers: number;
  verified: boolean;
  description: string;
  avatar?: string;
}

@Injectable()
export class ChinaSearchService {
  private readonly sogouLimiter = new RateLimiter(3000);
  private readonly bilibiliLimiter = new RateLimiter(2000);
  private readonly weiboLimiter = new RateLimiter(3000);

  // Circuit breaker for Sogou: skip remaining calls after consecutive 403s
  private sogouConsecutiveFailures = 0;
  private sogouCooldownUntil = 0;
  private readonly SOGOU_FAILURE_THRESHOLD = 3;
  private readonly SOGOU_COOLDOWN_MS = 10 * 60 * 1000; // 10min cooldown after tripping

  private getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async searchSogou(query: string): Promise<SearchResult[]> {
    // Circuit breaker: skip if we recently hit too many 403s
    if (Date.now() < this.sogouCooldownUntil) {
      return [];
    }

    await this.sogouLimiter.wait();

    // Re-check after waiting — another concurrent call may have tripped the breaker.
    if (Date.now() < this.sogouCooldownUntil) {
      return [];
    }

    try {
      const response = await axios.get('https://www.sogou.com/web', {
        params: { query, ie: 'utf-8' },
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      const results: SearchResult[] = [];

      $('.vrwrap, .rb').each((_, element) => {
        const titleElement = $(element).find('h3 a, .vr-title a, .vrTitle a').first();
        const title = titleElement.text().trim();
        let url = titleElement.attr('href') || '';
        if (url.startsWith('/link?url=')) url = `https://www.sogou.com${url}`;

        const snippet =
          $(element).find('.space-txt, .str-text-info, .str_info, .text-layout').text().trim() ||
          $(element).find('p').first().text().trim();

        if (title && url && !title.includes('大家还在搜')) {
          results.push({ title, content: snippet || title, url, source: 'sogou' as const });
        }
      });

      this.sogouConsecutiveFailures = 0; // reset on success
      console.log(`Sogou search for "${query}": found ${results.length} results`);
      return results;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) {
        const wasUnderThreshold = this.sogouConsecutiveFailures < this.SOGOU_FAILURE_THRESHOLD;
        this.sogouConsecutiveFailures++;
        if (wasUnderThreshold && this.sogouConsecutiveFailures >= this.SOGOU_FAILURE_THRESHOLD) {
          this.sogouCooldownUntil = Date.now() + this.SOGOU_COOLDOWN_MS;
          console.warn(`⚠️ Sogou hit ${this.SOGOU_FAILURE_THRESHOLD} consecutive 403s — cooling down 10min`);
        }
      } else {
        console.error('Sogou search error:', error instanceof Error ? error.message : error);
      }
      return [];
    }
  }

  async searchBilibili(query: string): Promise<SearchResult[]> {
    await this.bilibiliLimiter.wait();

    try {
      const buvid3 = `${crypto.randomUUID()}infoc`;

      const response = await withRetry(
        () => axios.get<any>(
          'https://api.bilibili.com/x/web-interface/search/type',
          {
            // order=totalrank → combined ranking (heat + relevance), better than pure pubdate
            //   which floods us with low-quality fresh uploads from tiny channels.
            // pagesize=30 → fetch more so we have enough after quality filter.
            params: { keyword: query, search_type: 'video', order: 'totalrank', page: 1, pagesize: 30 },
            headers: {
              'User-Agent': this.getRandomUserAgent(),
              Referer: 'https://search.bilibili.com/',
              Accept: 'application/json',
              Cookie: `buvid3=${buvid3}`,
            },
            timeout: 15000,
          },
        ),
        { retries: 2, delayMs: 700, label: `Bilibili "${query}"` },
      );

      if (response.data.code !== 0 || !response.data.data?.result) {
        console.log(`Bilibili search: no results or API error (code: ${response.data.code})`);
        return [];
      }

      const raw = response.data.data.result;

      // Quality filter — drop low-engagement videos from tiny channels.
      // Pass if ANY of: views ≥ 10000, likes ≥ 200, fan count ≥ 1000.
      // Plus minimum description length (avoid empty stub videos).
      const filtered = raw.filter((v: any) => {
        const views = v.play || 0;
        const likes = v.like || 0;
        const fans = v.fans || 0;
        const passQuality = views >= 10000 || likes >= 200 || fans >= 1000;
        const passContent = (v.description || '').length >= 10 || v.title.length >= 15;
        return passQuality && passContent;
      });

      // Take top 12 by combined heat after quality filter
      const ranked = filtered
        .sort((a: any, b: any) => (b.play || 0) + (b.like || 0) * 50 - ((a.play || 0) + (a.like || 0) * 50))
        .slice(0, 12);

      const results: SearchResult[] = ranked.map((video: any) => ({
        title: video.title.replace(/<\/?em[^>]*>/g, ''),
        content: video.description || video.title.replace(/<\/?em[^>]*>/g, ''),
        url: `https://www.bilibili.com/video/${video.bvid}`,
        source: 'bilibili' as const,
        sourceId: video.bvid,
        publishedAt: new Date(video.pubdate * 1000),
        viewCount: video.play,
        likeCount: video.like,
        commentCount: video.review,
        danmakuCount: video.danmaku,
        biliCategory: video.typename || video.type_name || '',
        biliTags: video.tag || '',
        favoritesCount: video.favorites || 0,
        author: { name: video.author, username: String(video.mid), followers: video.fans || null },
      }));

      console.log(`Bilibili search for "${query}": ${raw.length} → ${filtered.length} after quality filter → top ${results.length}`);
      return results;
    } catch (error) {
      console.error('Bilibili search error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  async searchWeibo(query: string): Promise<SearchResult[]> {
    await this.weiboLimiter.wait();

    try {
      const response = await axios.get('https://weibo.com/ajax/side/hotSearch', {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          Accept: 'application/json',
          Referer: 'https://weibo.com/',
        },
        timeout: 15000,
      });

      if (response.data?.ok !== 1 || !response.data?.data?.realtime) {
        console.log('Weibo hot search: no data or API error');
        return [];
      }

      const hotItems: any[] = response.data.data.realtime;
      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

      for (const item of hotItems) {
        const word = (item.note || item.word || '').toLowerCase();
        const isMatch =
          queryWords.some(qw => word.includes(qw) || qw.includes(word)) ||
          word.includes(queryLower) ||
          queryLower.includes(word);

        if (isMatch) {
          const topicName = item.note || item.word;
          const url = `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + topicName + '#')}`;
          results.push({
            title: `🔥 微博热搜: ${topicName}`,
            content: `微博热搜话题「${topicName}」，热度 ${item.num?.toLocaleString() || '未知'}`,
            url,
            source: 'weibo' as const,
            viewCount: item.num || 0,
          });
        }
      }

      console.log(`Weibo hot search: ${results.length} matches for "${query}"`);
      return results;
    } catch (error) {
      console.error('Weibo hot search error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /** Bilibili science/tech ranking — no keyword required */
  async getBilibiliTrending(): Promise<SearchResult[]> {
    await this.bilibiliLimiter.wait();
    try {
      const response = await axios.get<any>(
        'https://api.bilibili.com/x/web-interface/ranking/v2',
        {
          params: { rid: 36, type: 'all', day: 3 }, // rid=36 科技
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            Referer: 'https://www.bilibili.com/ranking/',
            Accept: 'application/json',
          },
          timeout: 15000,
        },
      );
      if (response.data.code !== 0 || !response.data.data?.list) return [];
      return response.data.data.list.map((v: any) => ({
        title: v.title,
        content: v.desc || v.title,
        url: `https://www.bilibili.com/video/${v.bvid}`,
        source: 'bilibili' as const,
        sourceId: v.bvid,
        publishedAt: new Date(v.pubdate * 1000),
        viewCount: v.stat?.view || 0,
        likeCount: v.stat?.like || 0,
        commentCount: v.stat?.reply || 0,
        danmakuCount: v.stat?.danmaku || 0,
        favoritesCount: v.stat?.favorite || 0,
        biliCategory: v.tname || '',
        biliTags: '',
        author: { name: v.owner?.name, username: String(v.owner?.mid) },
      }));
    } catch (error) {
      console.error('Bilibili trending error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /** Weibo hot search — all items, no keyword filter */
  async getWeiboHotAll(): Promise<SearchResult[]> {
    await this.weiboLimiter.wait();
    try {
      const response = await axios.get('https://weibo.com/ajax/side/hotSearch', {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          Accept: 'application/json',
          Referer: 'https://weibo.com/',
        },
        timeout: 15000,
      });
      if (response.data?.ok !== 1 || !response.data?.data?.realtime) return [];
      return response.data.data.realtime.map((item: any) => {
        const topicName = item.note || item.word || '';
        return {
          title: `微博热搜: ${topicName}`,
          content: `微博热搜话题「${topicName}」，热度 ${item.num?.toLocaleString() || '未知'}`,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + topicName + '#')}`,
          source: 'weibo' as const,
          viewCount: item.num || 0,
        };
      });
    } catch (error) {
      console.error('Weibo hot all error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  private async searchBilibiliUser(keyword: string): Promise<any | null> {
    await this.bilibiliLimiter.wait();

    try {
      const response = await axios.get<any>(
        'https://api.bilibili.com/x/web-interface/search/type',
        {
          params: { keyword, search_type: 'bili_user', page: 1, pagesize: 5 },
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            Referer: 'https://search.bilibili.com/',
            Accept: 'application/json',
          },
          timeout: 15000,
        },
      );

      if (response.data.code !== 0 || !response.data.data?.result?.length) return null;

      const exactMatch = response.data.data.result.find(
        (user: any) => user.uname === keyword || user.uname.toLowerCase() === keyword.toLowerCase(),
      );
      if (exactMatch) return exactMatch;

      const topResult = response.data.data.result[0];
      if (topResult.fans > 1000 && topResult.uname.includes(keyword)) return topResult;

      return null;
    } catch (error) {
      console.error('Bilibili user search error:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  private async getBilibiliUserVideos(mid: number): Promise<SearchResult[]> {
    await this.bilibiliLimiter.wait();

    try {
      const response = await axios.get<any>(
        'https://api.bilibili.com/x/space/arc/search',
        {
          params: { mid, pn: 1, ps: 10, order: 'pubdate' },
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            Referer: `https://space.bilibili.com/${mid}`,
            Accept: 'application/json',
          },
          timeout: 15000,
        },
      );

      if (response.data.code !== 0 || !response.data.data?.list?.vlist) return [];

      return response.data.data.list.vlist.map((video: any) => ({
        title: video.title,
        content: video.description || video.title,
        url: `https://www.bilibili.com/video/${video.bvid}`,
        source: 'bilibili' as const,
        sourceId: video.bvid,
        publishedAt: new Date(video.created * 1000),
        viewCount: video.play,
        commentCount: video.comment || video.review,
        danmakuCount: video.danmaku,
        author: { name: video.author, username: String(video.mid) },
      }));
    } catch (error) {
      console.error('Bilibili user videos error:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  async detectAndFetchAccount(keyword: string): Promise<{ accounts: AccountInfo[]; results: SearchResult[] }> {
    const accounts: AccountInfo[] = [];
    const results: SearchResult[] = [];

    try {
      const biliUser = await this.searchBilibiliUser(keyword);
      if (biliUser) {
        accounts.push({
          platform: 'bilibili',
          name: biliUser.uname,
          id: String(biliUser.mid),
          followers: biliUser.fans,
          verified: biliUser.official_verify?.type >= 0,
          description: biliUser.usign,
          avatar: biliUser.upic,
        });
        console.log(`🎯 Detected Bilibili account: ${biliUser.uname} (${biliUser.fans} fans)`);
        const userVideos = await this.getBilibiliUserVideos(biliUser.mid);
        results.push(...userVideos);
      }
    } catch (error) {
      console.error('Bilibili account detection error:', error instanceof Error ? error.message : error);
    }

    return { accounts, results };
  }
}
