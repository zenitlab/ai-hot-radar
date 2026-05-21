import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    if (source) where.source = source;
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
