import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { computeEventHeat, WINDOW_HOURS } from '../utils/event-heat';
import { PrismaService } from '../prisma/prisma.service';
import { TwitterService } from '../services/twitter.service';
import { SearchService } from '../services/search.service';
import { AiService } from '../services/ai.service';
import { sortHotspots } from '../utils/sortHotspots';

/**
 * Parse the JSON-stringified `media` column back into an object array so the
 * frontend doesn't have to JSON.parse it. Mutates a shallow copy.
 */
function parseMedia<T extends { media?: string | null }>(h: T): T & { media?: any[] | null } {
  if (!h.media) return h as any;
  try {
    return { ...h, media: JSON.parse(h.media) };
  } catch {
    return { ...h, media: null };
  }
}

/**
 * Within each cluster, push video sources (bilibili) to the bottom of their group.
 * The list overall stays in publish-time order — bilibili items can still appear
 * anywhere by themselves; this only affects positioning when multiple sources
 * cover the same event (same clusterKey). Text-based sources read faster, so
 * within a tight grouping we put text cards first.
 */
function reorderClusterByMedium<T extends { source: string; clusterKey?: string | null }>(items: T[]): T[] {
  const isVideo = (src: string) => src === 'bilibili';
  const groups = new Map<string, { textIdx: number[]; videoIdx: number[] }>();

  items.forEach((item, idx) => {
    const key = item.clusterKey || `__no_cluster_${idx}`;
    if (!groups.has(key)) groups.set(key, { textIdx: [], videoIdx: [] });
    const g = groups.get(key)!;
    if (isVideo(item.source)) g.videoIdx.push(idx);
    else g.textIdx.push(idx);
  });

  const seen = new Set<string>();
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const key = items[i].clusterKey || `__no_cluster_${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const g = groups.get(key)!;
    for (const idx of g.textIdx) result.push(items[idx]);
    for (const idx of g.videoIdx) result.push(items[idx]);
  }
  return result;
}

export interface HotspotFilterQuery {
  page?: string;
  limit?: string;
  source?: string;
  importance?: string;
  keywordId?: string;
  isReal?: string;
  timeRange?: string;
  timeFrom?: string;
  timeTo?: string;
  sortBy?: string;
  sortOrder?: string;
  category?: string;
  region?: string;
  search?: string;
}

@Injectable()
export class HotspotsService {
  constructor(
    private prisma: PrismaService,
    private twitterService: TwitterService,
    private searchService: SearchService,
    private aiService: AiService,
  ) {}

  async findAll(query: HotspotFilterQuery) {
    const {
      page = '1',
      limit = '20',
      source,
      importance,
      keywordId,
      isReal,
      timeRange,
      timeFrom,
      timeTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
      region,
      search,
    } = query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      // Fallback scores: T2=50, T1.5=55 (all-5s × tier multiplier when scoring errors out).
      // score=0 = explicitly not AI-related. All three are noise — only show score ≥ 60.
      qualityScore: { gte: 60 },
    };
    // Show only the cluster main so the same event doesn't appear as multiple cards.
    // Exception: when filtering by a specific source, dropping that source's non-main
    // cards would make whole events vanish from the source view — so skip the filter.
    if (!source) where.isClusterMain = true;
    if (source) {
      // 'reddit' is a prefix group — match all reddit_* sources (reddit_machinelearning etc.)
      // Same pattern applies to future prefix groups (rss, twitter_).
      if (source === 'reddit') {
        where.source = { startsWith: 'reddit_' };
      } else {
        where.source = source;
      }
    }
    if (importance) where.importance = importance;
    if (keywordId) where.keywordId = keywordId;
    if (isReal !== undefined && isReal !== '') where.isReal = isReal === 'true';
    if (category) where.category = category;
    if (region) where.region = region;
    if (search?.trim()) {
      // SQLite LIKE is case-insensitive for ASCII; no mode:'insensitive' needed
      where.OR = [
        { title:   { contains: search.trim() } },
        { summary: { contains: search.trim() } },
        { content: { contains: search.trim() } },
      ];
    }

    if (timeRange) {
      const now = new Date();
      let dateFrom: Date | null = null;
      switch (timeRange) {
        case '1h': dateFrom = new Date(now.getTime() - 60 * 60 * 1000); break;
        case 'today': dateFrom = new Date(now); dateFrom.setHours(0, 0, 0, 0); break;
        case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      }
      if (dateFrom) where.createdAt = { gte: dateFrom };
    } else if (timeFrom || timeTo) {
      where.createdAt = {};
      if (timeFrom) where.createdAt.gte = new Date(timeFrom);
      if (timeTo) where.createdAt.lte = new Date(timeTo);
    }

    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    const needsMemorySort = sortBy === 'importance' || sortBy === 'hot';

    let orderBy: any;
    switch (sortBy) {
      case 'publishedAt': orderBy = [{ publishedAt: order }, { createdAt: 'desc' }]; break;
      case 'relevance': orderBy = { relevance: order }; break;
      case 'importance':
      case 'hot': orderBy = [{ publishedAt: 'desc' }, { createdAt: 'desc' }]; break;
      // Default: sort by actual news publish time (publishedAt), with createdAt as fallback
      // for items that don't have a publish time. SQLite puts NULLs at the bottom on DESC.
      default: orderBy = [{ publishedAt: order }, { createdAt: order }]; break;
    }

    const [rawHotspots, total] = await Promise.all([
      this.prisma.hotspot.findMany({
        where,
        orderBy,
        ...(needsMemorySort ? {} : { skip, take: limitNum }),
        include: { keyword: { select: { id: true, text: true, category: true } } },
      }),
      this.prisma.hotspot.count({ where }),
    ]);

    let hotspots;
    if (needsMemorySort) {
      const sorted = sortHotspots(rawHotspots, sortBy, order as 'asc' | 'desc');
      hotspots = sorted.slice(skip, skip + limitNum);
    } else {
      hotspots = rawHotspots;
    }

    // Within each cluster, push bilibili (video) cards after text cards.
    // Doesn't affect overall publish-time ordering — only rearranges items that
    // share the same clusterKey on the current page.
    hotspots = reorderClusterByMedium(hotspots);

    return {
      data: hotspots.map(parseMedia),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  /**
   * Trending events: clusters reported by >= 2 independent sources in the last
   * 48h, ranked by decayed cross-source heat (see utils/event-heat.ts).
   * Returns the cluster main of each event plus its heat, trend and sources.
   */
  async getTrending(limitRaw = '10') {
    const limit = Math.min(Math.max(parseInt(limitRaw) || 10, 1), 50);
    const since = new Date(Date.now() - WINDOW_HOURS * 3600_000);
    const members = await this.prisma.hotspot.findMany({
      where: {
        clusterKey: { not: null },
        // Fallback / non-AI scores sit below 60; they shouldn't vouch for an event.
        qualityScore: { gte: 60 },
        OR: [
          { publishedAt: { gte: since } },
          { AND: [{ publishedAt: null }, { createdAt: { gte: since } }] },
        ],
      },
      select: { id: true, clusterKey: true, source: true, authorUsername: true, publishedAt: true, createdAt: true, isClusterMain: true },
    });

    const events = computeEventHeat(members).slice(0, limit);
    if (events.length === 0) return { data: [] };

    const mainIdByCluster = new Map<string, string>();
    for (const m of members) {
      if (m.isClusterMain && m.clusterKey && !mainIdByCluster.has(m.clusterKey)) mainIdByCluster.set(m.clusterKey, m.id);
    }
    const mainIds = events.map(e => mainIdByCluster.get(e.clusterKey) ?? e.itemIds[0]);
    const mains = await this.prisma.hotspot.findMany({
      where: { id: { in: mainIds } },
      include: { keyword: { select: { id: true, text: true, category: true } } },
    });
    const byId = new Map(mains.map(h => [h.id, h]));

    return {
      data: events.flatMap((e, i) => {
        const main = byId.get(mainIds[i]);
        if (!main) return [];
        return [{
          ...parseMedia(main),
          heat: e.heat,
          trend: e.trend,
          sources: e.participants,
          sourceCount: e.participants.length,
        }];
      }),
    };
  }

  /**
   * Event page data: every report in one cluster, oldest first, plus the main
   * item and source counts. `clusterKey` is opaque (a short hash), safe in URLs.
   * Returns null when the cluster doesn't exist.
   */
  async getStory(clusterKey: string) {
    if (!/^[a-f0-9]{8,32}$/i.test(clusterKey) && !/^[\w-]{3,64}$/.test(clusterKey)) return null;
    const items = await this.prisma.hotspot.findMany({
      where: { clusterKey },
      orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    if (items.length === 0) return null;

    const main = items.find(h => h.isClusterMain) ?? items[items.length - 1];
    const officialTiers = new Set(['T1', 'T1.5']);
    const time = (h: { publishedAt: Date | null; createdAt: Date }) => h.publishedAt ?? h.createdAt;
    return {
      clusterKey,
      main: parseMedia(main),
      items: items.map(parseMedia),
      sourceCount: new Set(items.map(h => h.source)).size,
      reportCount: items.length,
      officialCount: items.filter(h => officialTiers.has(h.sourceTier ?? '')).length,
      firstReportedAt: time(items[0]),
      lastUpdatedAt: time(items[items.length - 1]),
    };
  }

  /**
   * Event pages worth indexing: clusters with 2+ distinct sources in the last
   * 30 days. Single-source clusters stay noindex (thin page), so they're left
   * out of the sitemap too. Capped to keep the sitemap small.
   */
  async listStories(limit = 500) {
    const since = new Date(Date.now() - 30 * 24 * 3600_000);
    const rows = await this.prisma.hotspot.findMany({
      where: { clusterKey: { not: null }, qualityScore: { gte: 60 }, createdAt: { gte: since } },
      select: { clusterKey: true, source: true, publishedAt: true, createdAt: true },
    });
    const byKey = new Map<string, { sources: Set<string>; last: number }>();
    for (const r of rows) {
      const k = r.clusterKey!;
      const e = byKey.get(k) ?? { sources: new Set<string>(), last: 0 };
      e.sources.add(r.source);
      e.last = Math.max(e.last, (r.publishedAt ?? r.createdAt).getTime());
      byKey.set(k, e);
    }
    const data = [...byKey.entries()]
      .filter(([, e]) => e.sources.size >= 2)
      .sort((a, b) => b[1].last - a[1].last)
      .slice(0, limit)
      .map(([clusterKey, e]) => ({ clusterKey, lastUpdatedAt: new Date(e.last).toISOString() }));
    return { data };
  }

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalHotspots, todayHotspots, urgentHotspots, sourceStats] = await Promise.all([
      this.prisma.hotspot.count(),
      this.prisma.hotspot.count({ where: { createdAt: { gte: today } } }),
      this.prisma.hotspot.count({ where: { importance: 'urgent' } }),
      this.prisma.hotspot.groupBy({ by: ['source'], _count: { source: true } }),
    ]);

    return {
      total: totalHotspots,
      today: todayHotspots,
      urgent: urgentHotspots,
      bySource: sourceStats.reduce((acc: Record<string, number>, item: any) => {
        acc[item.source] = item._count.source;
        return acc;
      }, {}),
    };
  }

  async findOne(id: string) {
    const hotspot = await this.prisma.hotspot.findUnique({ where: { id }, include: { keyword: true } });
    if (!hotspot) throw new NotFoundException('Hotspot not found');
    return parseMedia(hotspot);
  }

  async search(body: { query: string; sources?: string[] }) {
    const { query, sources = ['twitter', 'bing'] } = body;
    if (!query) throw new BadRequestException('Query is required');

    const results: any[] = [];

    if (sources.includes('twitter')) {
      try {
        const tweets = await this.twitterService.searchTwitter(query);
        results.push(...tweets);
      } catch (error) {
        console.error('Twitter search failed:', error);
      }
    }

    if (sources.includes('bing')) {
      try {
        const webResults = await this.searchService.searchBing(query);
        results.push(...webResults);
      } catch (error) {
        console.error('Bing search failed:', error);
      }
    }

    const analyzedResults = await Promise.all(
      results.slice(0, 10).map(async item => {
        try {
          const analysis = await this.aiService.analyzeContent(item.title + ' ' + item.content, query);
          return { ...item, analysis };
        } catch {
          return { ...item, analysis: null };
        }
      }),
    );

    return { results: analyzedResults };
  }

  async remove(id: string) {
    try {
      await this.prisma.hotspot.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') throw new NotFoundException('Hotspot not found');
      throw error;
    }
  }
}
