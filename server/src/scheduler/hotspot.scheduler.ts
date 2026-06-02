import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { HotspotGateway } from '../gateway/hotspot.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../services/ai.service';
import { TwitterService } from '../services/twitter.service';
import { SearchService } from '../services/search.service';
import { ChinaSearchService } from '../services/china-search.service';
import { EmailService } from '../services/email.service';
import { ScoringService } from '../services/scoring.service';
import { RssService } from '../services/rss.service';
import { KEYWORD_GROUPS, X_ACCOUNTS } from '../rss-feeds/feeds.config';
import type { SourceTier, XAccountConfig } from '../rss-feeds/feeds.config';
import type { SearchResult } from '../types';
import { getAuthorityScore, resolveClusterKey, type ClusterClaim } from '../utils/authority';
import { tokenizeTitle } from '../utils/title-cluster';
import { needsKeywordPrefilter, titleLooksAiRelated } from '../utils/keyword-prefilter';

const MAX_AGE_HOURS = 2 * 24;
const TWITTER_QUOTA = 15;
const OTHER_QUOTA = 10;

function filterByFreshness(results: SearchResult[]): SearchResult[] {
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000);
  return results.filter(item => {
    // For sources that should always carry a date (search engines that scrape HTML),
    // missing publishedAt means "we don't know how old this is" — likely an old result
    // surfaced by the engine. Drop it rather than guess it's fresh.
    if (!item.publishedAt) {
      const sourcesRequiringDate = new Set(['bing']);
      if (sourcesRequiringDate.has(item.source)) return false;
      return true; // Other sources (rss, twitter, hn, bilibili) always have dates
    }
    return item.publishedAt >= cutoff;
  });
}

function prioritizeResults(results: SearchResult[]): SearchResult[] {
  const priorityMap: Record<string, number> = {
    twitter: 1, bilibili: 3, hackernews: 4, bing: 6,
  };
  return [...results].sort((a, b) => (priorityMap[a.source] || 99) - (priorityMap[b.source] || 99));
}

@Injectable()
export class HotspotScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(HotspotScheduler.name);
  private isScanning = false;
  private lastScanStartedAt: Date | null = null;
  private lastScanFinishedAt: Date | null = null;
  private lastScanError: string | null = null;

  constructor(
    private readonly gateway: HotspotGateway,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly twitterService: TwitterService,
    private readonly searchService: SearchService,
    private readonly chinaSearchService: ChinaSearchService,
    private readonly emailService: EmailService,
    private readonly scoringService: ScoringService,
    private readonly rssService: RssService,
  ) {}

  getScanStatus() {
    return {
      isScanning: this.isScanning,
      lastScanStartedAt: this.lastScanStartedAt,
      lastScanFinishedAt: this.lastScanFinishedAt,
      lastScanError: this.lastScanError,
    };
  }

  /** Fire-and-forget trigger. Returns immediately whether scan was started or already running. */
  triggerScan(): { started: boolean; reason?: string } {
    if (this.isScanning) {
      return { started: false, reason: 'already_running' };
    }
    this.runHotspotCheck().catch(err => this.logger.error('❌ Triggered scan failed:', err));
    return { started: true };
  }

  private emitProgress(phase: string, payload: Record<string, unknown> = {}): void {
    this.gateway.server.emit('scan:progress', { phase, ...payload, ts: Date.now() });
  }

  onApplicationBootstrap() {
    setTimeout(() => {
      this.logger.log('🚀 Running initial hotspot check on startup...');
      this.runHotspotCheck().catch(err => this.logger.error('❌ Initial hotspot check failed:', err));
    }, 3000);
  }

  @Cron('0 */10 * * * *')
  async runHotspotCheck(): Promise<void> {
    if (this.isScanning) {
      this.logger.warn('⚠️ Scan already in progress, skipping this trigger');
      return;
    }
    this.isScanning = true;
    this.lastScanStartedAt = new Date();
    this.lastScanError = null;
    this.gateway.server.emit('scan:status', { isScanning: true, startedAt: this.lastScanStartedAt });
    this.logger.log('🔍 Starting hotspot check...');
    const roundStart = Date.now();
    this.aiService.resetStats();

    try {
      // RSS + default search sources + X accounts all run in parallel
      this.emitProgress('sources_start');
      await Promise.all([
        this.processRssItems(),
        this.processDefaultSources(),
        this.processXAccounts(),
      ]);
      this.emitProgress('sources_done');

      // User-defined keyword monitoring (supplements default sources)
      const keywords = await this.prisma.keyword.findMany({ where: { isActive: true } });
      if (keywords.length === 0) {
        this.logger.log('No user keywords configured');
        this.emitProgress('keywords_skipped');
      } else {
        this.logger.log(`🔑 Checking ${keywords.length} user keywords in parallel...`);
        this.emitProgress('keywords_start', { total: keywords.length });
        let done = 0;
        const counts = await Promise.all(keywords.map(async (kw) => {
          const c = await this.processKeyword(kw);
          done += 1;
          this.emitProgress('keyword_done', { done, total: keywords.length, keyword: kw.text, found: c });
          return c;
        }));
        const total = counts.reduce((a, b) => a + b, 0);
        this.logger.log(`✨ Keyword check done. ${total} new hotspots.`);
        this.emitProgress('keywords_done', { total });
      }
      this.logRoundStats(roundStart);
    } catch (err) {
      this.lastScanError = err instanceof Error ? err.message : String(err);
      this.logger.error('❌ Scan failed:', err);
      throw err;
    } finally {
      this.isScanning = false;
      this.lastScanFinishedAt = new Date();
      const elapsedMs = Date.now() - roundStart;
      this.gateway.server.emit('scan:status', {
        isScanning: false,
        finishedAt: this.lastScanFinishedAt,
        elapsedMs,
        error: this.lastScanError,
      });
    }
  }

  /** Delete hotspots older than 30 days plus their notifications. Runs daily at 03:30 local. */
  @Cron('0 30 3 * * *')
  async cleanupOldHotspots(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete notifications first (they reference hotspots via hotspotId)
    const oldHotspots = await this.prisma.hotspot.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
    });
    const hotspotIds = oldHotspots.map(h => h.id);

    if (hotspotIds.length === 0) {
      this.logger.log('🧹 Cleanup: no hotspots older than 30 days');
      return;
    }

    const [delNotif, delHotspot] = await this.prisma.$transaction([
      this.prisma.notification.deleteMany({ where: { hotspotId: { in: hotspotIds } } }),
      this.prisma.hotspot.deleteMany({ where: { id: { in: hotspotIds } } }),
    ]);

    this.logger.log(`🧹 Cleanup: removed ${delHotspot.count} hotspots and ${delNotif.count} notifications older than 30d`);
  }

  private logRoundStats(roundStart: number): void {
    const stats = this.aiService.getStats();
    const elapsedSec = ((Date.now() - roundStart) / 1000).toFixed(1);
    const avgLatency = stats.calls > 0 ? Math.round(stats.latencyMs / stats.calls) : 0;
    const byKindStr = Object.entries(stats.byKind)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    this.logger.log(
      `📊 AI usage this round: ${stats.calls} calls (${stats.errors} errors), ` +
      `${stats.totalTokens} tokens (prompt=${stats.promptTokens}, completion=${stats.completionTokens}), ` +
      `avg ${avgLatency}ms/call, total ${elapsedSec}s | ${byKindStr}`,
    );
  }

  /** Fetch all 6 search-based sources using category-specific keyword groups + trending endpoints */
  private async processDefaultSources(): Promise<void> {
    this.logger.log('🌐 Fetching default search sources...');

    // Run all keyword groups in parallel; each item carries a targetCategory hint
    const groupResults = await Promise.allSettled(
      KEYWORD_GROUPS.map(group => this.fetchKeywordGroup(group))
    );

    // Bilibili tech trending (no keyword required, always run)
    // NOTE: getWeiboHotAll removed — Weibo trending is too noisy (celebrity/sports/news).
    // Weibo is only queried via KEYWORD_GROUPS with specific AI keywords.
    const biliTrendR = await Promise.allSettled([
      this.chinaSearchService.getBilibiliTrending(),
    ]);

    // Collect results with optional category hints
    const allRaw: Array<SearchResult & { _hint?: string }> = [];
    for (const r of groupResults) {
      if (r.status === 'fulfilled') allRaw.push(...r.value);
    }
    if (biliTrendR[0].status === 'fulfilled') allRaw.push(...biliTrendR[0].value);

    this.logger.log(`  ${allRaw.length} raw items from all groups`);
    const all = this.searchService.deduplicateResults(filterByFreshness(allRaw));

    // Bulk-check existing URLs
    const existingPairs = new Set(
      (await this.prisma.hotspot.findMany({
        where: { url: { in: all.map(i => i.url) } },
        select: { url: true, source: true },
      })).map(h => `${h.url}|${h.source}`)
    );
    const newItems = all.filter(item => !existingPairs.has(`${item.url}|${item.source}`));
    this.logger.log(`🌐 ${newItems.length} new items to score (${all.length - newItems.length} exist)`);

    let created = 0;
    const CONCURRENCY = 15;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Preload existing cluster mains with their authority scores.
    // New items can demote an old main if more authoritative (e.g. OpenAI Blog beats earlier V2EX repost).
    const existingMains = await this.prisma.hotspot.findMany({
      where: { createdAt: { gte: oneDayAgo }, isClusterMain: true },
      select: { id: true, clusterKey: true, source: true, sourceTier: true, title: true },
    });
    const claimedClusters = new Map<string, ClusterClaim>();
    for (const m of existingMains) {
      if (!m.clusterKey) continue;
      claimedClusters.set(m.clusterKey, {
        hotspotId: m.id,
        authority: getAuthorityScore(m.source, m.sourceTier as SourceTier | null),
        tokens: tokenizeTitle(m.title),
      });
    }

    for (let i = 0; i < newItems.length; i += CONCURRENCY) {
      const slice = newItems.slice(i, i + CONCURRENCY);

      // Build tier + hint per item
      const tiers = slice.map(item =>
        (item.source === 'twitter' && item.author?.verified && (item.author?.followers || 0) > 10000
          ? 'T1.5' : 'T2') as SourceTier,
      );
      const hints = slice.map(item => (item as SearchResult & { _hint?: string })._hint);

      // Score all items in parallel — single AI call per item, two-stage (preFilter + 5-dim).
      const scorings = await Promise.all(
        slice.map((item, idx) => this.scoringService.score(
          item.title, item.content, tiers[idx], hints[idx], item.publishedAt,
        )),
      );

      // 方案2: remap each item to an existing similar cluster (token Jaccard) before planning.
      const clusterTokens = slice.map(item => tokenizeTitle(item.title));
      const keys = slice.map((_, j) => resolveClusterKey(clusterTokens[j], scorings[j].clusterKey, claimedClusters));

      // Plan cluster mains: pick the most authoritative item per cluster, collect demotions.
      const mainIdx = new Map<string, number>();
      const demotions: string[] = [];
      for (let j = 0; j < slice.length; j++) {
        const sc = scorings[j];
        if (!sc.isCurated && sc.qualityScore < 60) continue;
        const auth = getAuthorityScore(slice[j].source, tiers[j]);
        const existing = claimedClusters.get(keys[j]);
        const winnerIdx = mainIdx.get(keys[j]);
        const winnerAuth = winnerIdx !== undefined
          ? getAuthorityScore(slice[winnerIdx].source, tiers[winnerIdx])
          : -Infinity;
        const bestPriorAuth = Math.max(existing?.authority ?? -Infinity, winnerAuth);
        if (auth > bestPriorAuth) {
          mainIdx.set(keys[j], j);
          if (existing?.hotspotId && auth > existing.authority) {
            demotions.push(existing.hotspotId);
          }
        }
      }

      const results = await Promise.allSettled(
        slice.map(async (item, idx) => {
          const scoring = scorings[idx];
          const tier = tiers[idx];
          if (!scoring.isCurated && scoring.qualityScore < 60) return null;

          const region = ['bilibili'].includes(item.source)
            ? 'domestic'
            : scoring.region;

          const isClusterMain = mainIdx.get(keys[idx]) === idx;
          const authority = getAuthorityScore(item.source, tier);

          const hotspot = await this.prisma.hotspot.create({
            data: {
              title: item.title, content: item.content, url: item.url,
              source: item.source, sourceId: item.sourceId || null,
              sourceTier: tier,
              category: scoring.category, region,
              qualityScore: scoring.qualityScore, isCurated: scoring.isCurated,
              tags: scoring.tags.length > 0 ? JSON.stringify(scoring.tags) : null,
              clusterKey: keys[idx], isClusterMain,
              importance: scoring.importance, summary: scoring.summary || null,
              isReal: true, relevance: Math.round(scoring.qualityScore),
              publishedAt: item.publishedAt || null,
              viewCount: item.viewCount || null, likeCount: item.likeCount || null,
              commentCount: item.commentCount || null, danmakuCount: item.danmakuCount || null,
              media: item.media ? JSON.stringify(item.media) : null,
              authorName: item.author?.name || null, authorUsername: item.author?.username || null,
              authorFollowers: item.author?.followers || null,
              biliCategory: item.biliCategory || null, biliTags: item.biliTags || null,
              favoritesCount: item.favoritesCount || null,
              keywordId: null,
            },
          });

          if (isClusterMain) {
            // Update in-memory claim so subsequent batches see the new authority
            claimedClusters.set(keys[idx], { hotspotId: hotspot.id, authority, tokens: clusterTokens[idx] });
          }

          if (scoring.isCurated && ['high', 'urgent'].includes(scoring.importance)) {
            const notif = await this.prisma.notification.create({
              data: {
                type: 'hotspot',
                title: `🌐 ${item.source}: ${item.title.slice(0, 50)}`,
                content: scoring.summary || item.title,
                hotspotId: hotspot.id,
              },
            });
            this.gateway.server.emit('notification', {
              type: 'hotspot', title: notif.title, content: notif.content,
              hotspotId: hotspot.id, importance: scoring.importance,
            });
          }
          return hotspot;
        }),
      );
      created += results.filter(r => r.status === 'fulfilled' && r.value).length;

      // Demote any old mains that lost to a more authoritative new item.
      const uniqueDemotions = [...new Set(demotions)];
      if (uniqueDemotions.length > 0) {
        await this.prisma.hotspot.updateMany({
          where: { id: { in: uniqueDemotions } },
          data: { isClusterMain: false },
        });
      }
    }
    this.logger.log(`🌐 Default sources done: ${created} new items`);
  }

  /**
   * Fetch latest tweets from each configured X account directly (not via keyword search).
   * Each account is treated as a first-class source with its own tier and authority.
   */
  private async processXAccounts(): Promise<void> {
    this.logger.log(`🐦 Fetching ${X_ACCOUNTS.length} X accounts...`);

    // Pull last tweets in parallel — twitterapi.io's RateLimiter inside TwitterService serializes them.
    const settled = await Promise.allSettled(
      X_ACCOUNTS.map(async (acc) => {
        const tweets = await this.twitterService.getUserTweets(acc.username);
        return tweets.map(t => ({ tweet: t, account: acc }));
      }),
    );

    type Item = { tweet: SearchResult; account: XAccountConfig };
    const allItems: Item[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') allItems.push(...r.value);
    }

    if (allItems.length === 0) {
      this.logger.log('🐦 No tweets fetched (key missing or all requests failed)');
      return;
    }

    // Filter by freshness; tweets always have publishedAt
    const fresh = allItems.filter(it => {
      if (!it.tweet.publishedAt) return false;
      return it.tweet.publishedAt >= new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000);
    });

    // Bulk-check existing URLs — sources are 'twitter_<username>' for X-account-sourced items.
    const sources = fresh.map(it => `twitter_${it.account.username.toLowerCase()}`);
    const existingPairs = new Set(
      (await this.prisma.hotspot.findMany({
        where: { url: { in: fresh.map(it => it.tweet.url) } },
        select: { url: true, source: true },
      })).map(h => `${h.url}|${h.source}`),
    );
    const newItems = fresh.filter((_, idx) => !existingPairs.has(`${fresh[idx].tweet.url}|${sources[idx]}`));
    this.logger.log(`🐦 ${newItems.length} new tweets to score (${fresh.length - newItems.length} already exist)`);

    if (newItems.length === 0) return;

    let created = 0;
    const CONCURRENCY = 15;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Preload existing cluster mains (shared with other paths via same Map structure).
    const existingMains = await this.prisma.hotspot.findMany({
      where: { createdAt: { gte: oneDayAgo }, isClusterMain: true },
      select: { id: true, clusterKey: true, source: true, sourceTier: true, title: true },
    });
    const claimedClusters = new Map<string, ClusterClaim>();
    for (const m of existingMains) {
      if (!m.clusterKey) continue;
      claimedClusters.set(m.clusterKey, {
        hotspotId: m.id,
        authority: getAuthorityScore(m.source, m.sourceTier as SourceTier | null),
        tokens: tokenizeTitle(m.title),
      });
    }

    for (let i = 0; i < newItems.length; i += CONCURRENCY) {
      const slice = newItems.slice(i, i + CONCURRENCY);
      const sliceSources = slice.map(it => `twitter_${it.account.username.toLowerCase()}`);

      // Two-stage scoring per item (preFilter + 5-dim, T1 skips preFilter).
      const scorings = await Promise.all(
        slice.map(it => this.scoringService.score(
          it.tweet.title, it.tweet.content, it.account.tier, it.account.defaultCategory, it.tweet.publishedAt,
        )),
      );

      // 方案2: remap each tweet to an existing similar cluster (token Jaccard) before planning.
      const clusterTokens = slice.map(it => tokenizeTitle(it.tweet.title));
      const keys = slice.map((_, j) => resolveClusterKey(clusterTokens[j], scorings[j].clusterKey, claimedClusters));

      // Plan cluster mains.
      const authorities = slice.map((it, idx) => getAuthorityScore(sliceSources[idx], it.account.tier));
      const mainIdx = new Map<string, number>();
      const demotions: string[] = [];
      for (let j = 0; j < slice.length; j++) {
        const sc = scorings[j];
        if (!sc.isCurated && sc.qualityScore < 60) continue;
        const auth = authorities[j];
        const existing = claimedClusters.get(keys[j]);
        const winnerIdx = mainIdx.get(keys[j]);
        const winnerAuth = winnerIdx !== undefined ? authorities[winnerIdx] : -Infinity;
        const bestPriorAuth = Math.max(existing?.authority ?? -Infinity, winnerAuth);
        if (auth > bestPriorAuth) {
          mainIdx.set(keys[j], j);
          if (existing?.hotspotId && auth > existing.authority) {
            demotions.push(existing.hotspotId);
          }
        }
      }

      const results = await Promise.allSettled(
        slice.map(async (it, idx) => {
          const scoring = scorings[idx];
          if (!scoring.isCurated && scoring.qualityScore < 60) return null;
          const source = sliceSources[idx];
          const isClusterMain = mainIdx.get(keys[idx]) === idx;

          const hotspot = await this.prisma.hotspot.create({
            data: {
              title: it.tweet.title, content: it.tweet.content, url: it.tweet.url,
              source, sourceId: it.tweet.sourceId || null,
              sourceTier: it.account.tier,
              category: scoring.category, region: scoring.region,
              qualityScore: scoring.qualityScore, isCurated: scoring.isCurated,
              tags: scoring.tags.length > 0 ? JSON.stringify(scoring.tags) : null,
              clusterKey: keys[idx], isClusterMain,
              importance: scoring.importance, summary: scoring.summary || null,
              isReal: true, relevance: Math.round(scoring.qualityScore),
              publishedAt: it.tweet.publishedAt || null,
              viewCount: it.tweet.viewCount || null, likeCount: it.tweet.likeCount || null,
              retweetCount: it.tweet.retweetCount || null, replyCount: it.tweet.replyCount || null,
              quoteCount: it.tweet.quoteCount || null,
              media: it.tweet.media ? JSON.stringify(it.tweet.media) : null,
              authorName: it.tweet.author?.name || null,
              authorUsername: it.tweet.author?.username || it.account.username,
              authorAvatar: it.tweet.author?.avatar || null,
              authorFollowers: it.tweet.author?.followers || null,
              authorVerified: it.tweet.author?.verified ?? null,
              keywordId: null,
            },
          });

          if (isClusterMain) {
            claimedClusters.set(keys[idx], { hotspotId: hotspot.id, authority: authorities[idx], tokens: clusterTokens[idx] });
          }

          if (scoring.isCurated && ['high', 'urgent'].includes(scoring.importance)) {
            const notif = await this.prisma.notification.create({
              data: {
                type: 'hotspot',
                title: `🐦 ${it.account.name}: ${it.tweet.title.slice(0, 50)}`,
                content: scoring.summary || it.tweet.title,
                hotspotId: hotspot.id,
              },
            });
            this.gateway.server.emit('notification', {
              type: 'hotspot', title: notif.title, content: notif.content,
              hotspotId: hotspot.id, importance: scoring.importance,
            });
          }
          return hotspot;
        }),
      );
      created += results.filter(r => r.status === 'fulfilled' && r.value).length;

      const uniqueDemotions = [...new Set(demotions)];
      if (uniqueDemotions.length > 0) {
        await this.prisma.hotspot.updateMany({
          where: { id: { in: uniqueDemotions } },
          data: { isClusterMain: false },
        });
      }
    }

    this.logger.log(`🐦 X accounts done: ${created} new items`);
  }

  /** Process a single user-defined keyword across all search sources */
  private async processKeyword(keyword: { id: string; text: string }): Promise<number> {
    this.logger.log(`\n📎 Keyword: "${keyword.text}"`);
    let count = 0;

    try {
      const accountResult = await this.chinaSearchService.detectAndFetchAccount(keyword.text);
      const expandedKeywords = await this.aiService.expandKeyword(keyword.text);

      const [twitterR, bingR, hnR, biliR] = await Promise.allSettled([
        this.twitterService.searchTwitter(keyword.text),
        this.searchService.searchBing(keyword.text),
        this.searchService.searchHackerNews(keyword.text),
        this.chinaSearchService.searchBilibili(keyword.text),
      ]);

      const allResults: SearchResult[] = [...accountResult.results];
      for (const r of [twitterR, bingR, hnR, biliR]) {
        if (r.status === 'fulfilled') allResults.push(...r.value);
      }

      const sortedResults = prioritizeResults(filterByFreshness(this.searchService.deduplicateResults(allResults)));

      // Bulk pre-check existing URLs to avoid duplicate writes under parallelism
      const existingPairs = new Set(
        (await this.prisma.hotspot.findMany({
          where: { url: { in: sortedResults.map(i => i.url) } },
          select: { url: true, source: true },
        })).map(h => `${h.url}|${h.source}`),
      );
      const fresh = sortedResults.filter(item => !existingPairs.has(`${item.url}|${item.source}`));

      // Preload existing cluster mains with their authority scores so a more authoritative
      // new item can demote an old main (e.g. OpenAI Blog beats earlier V2EX repost).
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existingMains = await this.prisma.hotspot.findMany({
        where: { createdAt: { gte: oneDayAgo }, isClusterMain: true },
        select: { id: true, clusterKey: true, source: true, sourceTier: true, title: true },
      });
      const claimedClusters = new Map<string, ClusterClaim>();
      for (const m of existingMains) {
        if (!m.clusterKey) continue;
        claimedClusters.set(m.clusterKey, {
          hotspotId: m.id,
          authority: getAuthorityScore(m.source, m.sourceTier as SourceTier | null),
          tokens: tokenizeTitle(m.title),
        });
      }

      const CONCURRENCY = 15;
      let twitterProcessed = 0, otherProcessed = 0;

      for (let i = 0; i < fresh.length; i += CONCURRENCY) {
        if (twitterProcessed >= TWITTER_QUOTA && otherProcessed >= OTHER_QUOTA) break;

        // Take the next slice and apply quota gating per-item
        const slice = fresh.slice(i, i + CONCURRENCY);
        const eligible = slice.filter(item => {
          if (item.source === 'twitter') return twitterProcessed < TWITTER_QUOTA;
          return otherProcessed < OTHER_QUOTA;
        });
        if (eligible.length === 0) continue;

        const settled = await Promise.allSettled(
          eligible.map(item => this.processOneKeywordItem(item, keyword, expandedKeywords, claimedClusters)),
        );

        for (let j = 0; j < settled.length; j++) {
          const r = settled[j];
          const item = eligible[j];
          if (r.status === 'fulfilled' && r.value) {
            count++;
            if (item.source === 'twitter') twitterProcessed++; else otherProcessed++;
          } else if (r.status === 'rejected') {
            this.logger.error(`  Error processing result:`, r.reason);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking keyword "${keyword.text}":`, error);
    }

    // After search-source processing, also link any RSS / default-source / X-account
    // hotspots in the last 24h that mention this keyword. This way "我的关注" sees
    // matches from ALL channels, not just the 4 search APIs we drove explicitly.
    try {
      const linked = await this.linkExistingHotspotsToKeyword(keyword);
      if (linked > 0) {
        this.logger.log(`  🔗 Linked ${linked} existing hotspots to keyword "${keyword.text}"`);
        count += linked;
      }
    } catch (err) {
      this.logger.error(`Error linking existing hotspots for "${keyword.text}":`, err);
    }

    return count;
  }

  /**
   * Find recent (24h) hotspots that mention the keyword text but don't yet have
   * a keywordId, and attach this keyword to them. Used so RSS / X-account / default
   * source items also surface in "我的关注" — not just keyword-driven search results.
   */
  private async linkExistingHotspotsToKeyword(
    keyword: { id: string; text: string },
  ): Promise<number> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const text = keyword.text.trim();
    if (!text) return 0;

    const result = await this.prisma.hotspot.updateMany({
      where: {
        createdAt: { gte: oneDayAgo },
        keywordId: null,
        OR: [
          { title:   { contains: text } },
          { summary: { contains: text } },
          { content: { contains: text } },
        ],
      },
      data: { keywordId: keyword.id },
    });
    return result.count;
  }

  /** Process a single search result for a user keyword. Returns the hotspot if saved, null if filtered out. */
  private async processOneKeywordItem(
    item: SearchResult,
    keyword: { id: string; text: string },
    expandedKeywords: string[],
    claimedClusters: Map<string, ClusterClaim>,
  ): Promise<unknown> {
    const fullText = item.title + '\n' + item.content;
    const preMatch = this.aiService.preMatchKeyword(fullText, expandedKeywords);
    const analysis = await this.aiService.analyzeContent(fullText, keyword.text, preMatch);

    if (!analysis.isReal || analysis.relevance < 50) return null;
    if (!analysis.keywordMentioned && analysis.relevance < 65) return null;

    const tier: SourceTier =
      item.source === 'twitter' && item.author?.verified && (item.author?.followers || 0) > 10000
        ? 'T1.5' : 'T2';
    const scoring = await this.scoringService.score(item.title, item.content, tier, undefined, item.publishedAt);

    const region = ['bilibili'].includes(item.source)
      ? 'domestic'
      : scoring.region;

    // Authority-based cluster main: more authoritative source wins, can demote prior main.
    // 方案2: remap to an existing similar cluster before claiming, so reworded
    // headlines of the same event join one cluster instead of spawning duplicates.
    const itemTokens = tokenizeTitle(item.title);
    const clusterKey = resolveClusterKey(itemTokens, scoring.clusterKey, claimedClusters);
    const authority = getAuthorityScore(item.source, tier);
    const existing = claimedClusters.get(clusterKey);
    const isClusterMain = !existing || authority > existing.authority;
    let demoteId: string | undefined;
    if (isClusterMain && existing?.hotspotId && authority > existing.authority) {
      demoteId = existing.hotspotId;
    }

    const hotspot = await this.prisma.hotspot.create({
      data: {
        title: item.title, content: item.content, url: item.url,
        source: item.source, sourceId: item.sourceId || null,
        isReal: analysis.isReal, relevance: analysis.relevance,
        relevanceReason: analysis.relevanceReason || null,
        keywordMentioned: analysis.keywordMentioned ?? null,
        importance: analysis.importance, summary: analysis.summary,
        viewCount: item.viewCount || null, likeCount: item.likeCount || null,
        retweetCount: item.retweetCount || null, replyCount: item.replyCount || null,
        commentCount: item.commentCount || null, quoteCount: item.quoteCount || null,
        danmakuCount: item.danmakuCount || null,
        media: item.media ? JSON.stringify(item.media) : null,
        authorName: item.author?.name || null, authorUsername: item.author?.username || null,
        authorAvatar: item.author?.avatar || null, authorFollowers: item.author?.followers || null,
        authorVerified: item.author?.verified ?? null,
        publishedAt: item.publishedAt || null, keywordId: keyword.id,
        category: scoring.category, region,
        sourceTier: tier, qualityScore: scoring.qualityScore, isCurated: scoring.isCurated,
        tags: scoring.tags.length > 0 ? JSON.stringify(scoring.tags) : null,
        clusterKey, isClusterMain,
        biliCategory: item.biliCategory || null, biliTags: item.biliTags || null,
        favoritesCount: item.favoritesCount || null,
      },
      include: { keyword: true },
    });

    if (isClusterMain) {
      claimedClusters.set(clusterKey, { hotspotId: hotspot.id, authority, tokens: itemTokens });
      if (demoteId) {
        await this.prisma.hotspot.update({
          where: { id: demoteId },
          data: { isClusterMain: false },
        });
      }
    }

    this.logger.log(`  ✅ [${item.source}]: ${hotspot.title.slice(0, 40)}...`);

    await this.prisma.notification.create({
      data: {
        type: 'hotspot',
        title: `发现新热点: ${hotspot.title.slice(0, 50)}`,
        content: analysis.summary || hotspot.content.slice(0, 100),
        hotspotId: hotspot.id,
      },
    });
    this.gateway.server.to(`keyword:${keyword.text}`).emit('hotspot:new', hotspot);
    this.gateway.server.emit('notification', {
      type: 'hotspot', title: '发现新热点', content: hotspot.title,
      hotspotId: hotspot.id, importance: hotspot.importance,
    });
    if (['high', 'urgent'].includes(analysis.importance)) {
      await this.emailService.sendHotspotEmail(hotspot);
    }
    return hotspot;
  }

  /** Fetch one keyword group from its designated sources, tagging each result with _hint */
  private async fetchKeywordGroup(
    group: import('../rss-feeds/feeds.config').KeywordGroup,
  ): Promise<Array<SearchResult & { _hint?: string }>> {
    const sourceMap: Record<string, (q: string) => Promise<SearchResult[]>> = {
      bing:       q => this.searchService.searchBing(q),
      hackernews: q => this.searchService.searchHackerNews(q),
      bilibili:   q => this.chinaSearchService.searchBilibili(q),
      twitter:    q => this.twitterService.searchTwitter(q),
    };

    const calls = group.sources.flatMap(src =>
      group.keywords.map(kw => sourceMap[src]?.(kw) ?? Promise.resolve([]))
    );
    const settled = await Promise.allSettled(calls);
    const raw = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    const deduped = this.searchService.deduplicateResults(raw);

    // Attach category hint if group specifies one
    if (group.targetCategory) {
      return deduped.map(item => ({ ...item, _hint: group.targetCategory! }));
    }
    return deduped;
  }

  /** Search a source with multiple keywords, dedup by URL */
  private async searchMultiKeyword(
    fn: (query: string) => Promise<SearchResult[]>,
    keywords: string[],
  ): Promise<SearchResult[]> {
    const settled = await Promise.allSettled(keywords.map(kw => fn(kw)));
    const all = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
    return this.searchService.deduplicateResults(all);
  }

  private async processRssItems(): Promise<void> {
    this.logger.log('📡 Fetching RSS feeds...');
    const rssItems = await this.rssService.fetchAllFeeds(15);
    this.logger.log(`📡 Got ${rssItems.length} RSS items`);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Pre-check existence in bulk
    const validItems = rssItems.filter(item => item.url && item.title);
    const existingUrls = new Set(
      (await this.prisma.hotspot.findMany({
        where: { url: { in: validItems.map(i => i.url) } },
        select: { url: true, source: true },
      })).map(h => `${h.url}|${h.source}`)
    );

    const newItems = validItems.filter(item => {
      const source = `rss_${item.feedConfig.category}`;
      if (existingUrls.has(`${item.url}|${source}`)) return false;
      // Cheap keyword pre-filter for generic news sources (IT之家/36氪/财联社 etc.)
      // — drops obviously non-AI items before they consume any AI tokens.
      if (needsKeywordPrefilter(item.feedConfig.category)) {
        return titleLooksAiRelated(item.title, item.content);
      }
      return true;
    });

    this.logger.log(`📡 ${newItems.length} new items to score (${validItems.length - newItems.length} skipped: existing or non-AI)`);

    let created = 0;
    const CONCURRENCY = 15;
    const existingMains = await this.prisma.hotspot.findMany({
      where: { createdAt: { gte: oneDayAgo }, isClusterMain: true },
      select: { id: true, clusterKey: true, source: true, sourceTier: true, title: true },
    });
    const claimedClusters = new Map<string, ClusterClaim>();
    for (const m of existingMains) {
      if (!m.clusterKey) continue;
      claimedClusters.set(m.clusterKey, {
        hotspotId: m.id,
        authority: getAuthorityScore(m.source, m.sourceTier as SourceTier | null),
        tokens: tokenizeTitle(m.title),
      });
    }

    for (let i = 0; i < newItems.length; i += CONCURRENCY) {
      const batch = newItems.slice(i, i + CONCURRENCY);

      // Score all items in parallel — single AI call per item, two-stage (preFilter + 5-dim).
      const scorings = await Promise.all(
        batch.map(item => this.scoringService.score(
          item.title, item.content, item.feedConfig.tier, item.feedConfig.defaultCategory, item.publishedAt,
        )),
      );

      // 方案2: remap each item to an existing similar cluster (token Jaccard) before planning.
      const clusterTokens = batch.map(item => tokenizeTitle(item.title));
      const keys = batch.map((_, j) => resolveClusterKey(clusterTokens[j], scorings[j].clusterKey, claimedClusters));

      // Plan cluster mains: pick the most authoritative item per cluster within this batch.
      const sources = batch.map(item => `rss_${item.feedConfig.category}`);
      const authorities = batch.map((item, idx) =>
        getAuthorityScore(sources[idx], item.feedConfig.tier),
      );
      const mainIdx = new Map<string, number>();
      const demotions: string[] = [];
      for (let j = 0; j < batch.length; j++) {
        const sc = scorings[j];
        if (!sc.isCurated && sc.qualityScore < 60) continue;
        const auth = authorities[j];
        const existing = claimedClusters.get(keys[j]);
        const winnerIdx = mainIdx.get(keys[j]);
        const winnerAuth = winnerIdx !== undefined ? authorities[winnerIdx] : -Infinity;
        const bestPriorAuth = Math.max(existing?.authority ?? -Infinity, winnerAuth);
        if (auth > bestPriorAuth) {
          mainIdx.set(keys[j], j);
          if (existing?.hotspotId && auth > existing.authority) {
            demotions.push(existing.hotspotId);
          }
        }
      }

      const results = await Promise.allSettled(
        batch.map(async (item, idx) => {
          const source = sources[idx];
          const scoring = scorings[idx];
          if (!scoring.isCurated && scoring.qualityScore < 60) return null;

          const isClusterMain = mainIdx.get(keys[idx]) === idx;

          const hotspot = await this.prisma.hotspot.create({
            data: {
              title: item.title,
              content: item.content,
              url: item.url,
              source,
              sourceTier: item.feedConfig.tier,
              category: scoring.category,
              // Use AI-determined region (by topic), not source nationality.
              // E.g. IT之家 reporting OpenAI = international (topic), not domestic (source).
              region: scoring.region,
              qualityScore: scoring.qualityScore,
              isCurated: scoring.isCurated,
              tags: scoring.tags.length > 0 ? JSON.stringify(scoring.tags) : null,
              clusterKey: keys[idx],
              isClusterMain,
              importance: scoring.importance,
              summary: scoring.summary || null,
              isReal: true,
              relevance: Math.round(scoring.qualityScore),
              publishedAt: item.publishedAt || null,
              keywordId: null,
            },
          });

          if (isClusterMain) {
            claimedClusters.set(keys[idx], { hotspotId: hotspot.id, authority: authorities[idx], tokens: clusterTokens[idx] });
          }

          if (scoring.isCurated && ['high', 'urgent'].includes(scoring.importance)) {
            const notification = await this.prisma.notification.create({
              data: {
                type: 'hotspot',
                title: `📡 RSS 精选: ${item.title.slice(0, 50)}`,
                content: scoring.summary || item.title,
                hotspotId: hotspot.id,
              },
            });
            this.gateway.server.emit('notification', {
              type: 'hotspot', title: notification.title,
              content: notification.content, hotspotId: hotspot.id, importance: scoring.importance,
            });
          }
          return hotspot;
        }),
      );

      created += results.filter(r => r.status === 'fulfilled' && r.value).length;

      // Demote any old mains that lost to a more authoritative new RSS item.
      const uniqueDemotions = [...new Set(demotions)];
      if (uniqueDemotions.length > 0) {
        await this.prisma.hotspot.updateMany({
          where: { id: { in: uniqueDemotions } },
          data: { isClusterMain: false },
        });
      }

      this.logger.log(`📡 Batch ${Math.floor(i / CONCURRENCY) + 1}: processed, total created=${created}`);
    }

    this.logger.log(`📡 RSS processing done: ${created} new items`);
  }
}
