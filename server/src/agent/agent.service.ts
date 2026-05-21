import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurated(limit = 20, offset = 0) {
    return this.prisma.hotspot.findMany({
      where: { isCurated: true, isClusterMain: true },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });
  }

  async search(q: string, limit = 20) {
    const keywords = q.split(/\s+/).filter((w) => w.length > 0).slice(0, 5);
    const conditions = keywords.map((kw) => ({
      OR: [{ title: { contains: kw } }, { summary: { contains: kw } }],
    }));
    return this.prisma.hotspot.findMany({
      where: { AND: conditions },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async getStats() {
    const total = await this.prisma.hotspot.count();
    const curated = await this.prisma.hotspot.count({ where: { isCurated: true } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.hotspot.count({ where: { createdAt: { gte: today } } });
    return { total, curated, today: todayCount, updatedAt: new Date().toISOString() };
  }

  /** Build RSS 2.0 XML for a list of hotspots */
  buildRssXml(title: string, description: string, items: Array<{
    title: string; url: string; summary?: string | null;
    publishedAt?: Date | null; source: string;
  }>): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const itemsXml = items.map((item) => `
    <item>
      <title>${escape(item.title)}</title>
      <link>${escape(item.url)}</link>
      <description>${escape(item.summary || item.title)}</description>
      <pubDate>${(item.publishedAt || new Date()).toUTCString()}</pubDate>
      <source>${escape(item.source)}</source>
    </item>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escape(title)}</title>
    <description>${escape(description)}</description>
    <link>https://github.com/aihot</link>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${itemsXml}
  </channel>
</rss>`;
  }
}
