import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type CuratedPeriod = 'today' | 'week';

export interface CuratedFilter {
  period?: CuratedPeriod;
  limit?: number;
  offset?: number;
  /** 'model' | 'product' | 'industry' | 'research' | 'community' | 'tips' */
  category?: string;
  /** 'domestic' | 'international' */
  region?: string;
  /** Free-text search across title / summary / content */
  search?: string;
}

@Injectable()
export class CuratedService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurated(filter: CuratedFilter = {}) {
    const { period = 'today', limit = 20, offset = 0, category, region, search } = filter;
    const now = new Date();
    // Beijing time offset = UTC+8
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const today = beijingNow.toISOString().slice(0, 10);

    let dateFrom: Date;
    if (period === 'today') {
      // Today in Beijing time: from 00:00 UTC+8 = previous day 16:00 UTC
      dateFrom = new Date(`${today}T00:00:00+08:00`);
    } else {
      // Past 7 days
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const where: any = {
      isCurated: true,
      isClusterMain: true,
      // Filter by actual publish time, not DB ingestion time. An old article
      // scraped today by Bing would otherwise leak into "今日精选" — its createdAt
      // is today but publishedAt was days/weeks ago. Fall back to createdAt only
      // for items that genuinely have no publishedAt (rare).
      OR: [
        { publishedAt: { gte: dateFrom } },
        { AND: [{ publishedAt: null }, { createdAt: { gte: dateFrom } }] },
      ],
    };
    if (category) where.category = category;
    if (region) where.region = region;
    if (search?.trim()) {
      // Search adds a second OR — combine into AND so both date and text constraints apply.
      const dateOr = where.OR;
      delete where.OR;
      where.AND = [
        { OR: dateOr },
        {
          OR: [
            { title:   { contains: search.trim() } },
            { summary: { contains: search.trim() } },
            { content: { contains: search.trim() } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.hotspot.findMany({
        where,
        orderBy: [
          // Time-first ordering: newest publications appear at the top.
          // Quality score acts as tiebreaker for items published at the same minute.
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
          { qualityScore: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: { keyword: true },
      }),
      this.prisma.hotspot.count({ where }),
    ]);

    return { period, total, limit, offset, items };
  }
}
