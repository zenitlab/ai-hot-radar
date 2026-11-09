import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { IndexNowService } from '../services/indexnow.service';
import { HotspotsService } from './hotspots.service';

/**
 * Pushes newly indexable pages to IndexNow: multi-source event pages (the same
 * set the sitemap lists) and the last week of daily digests. Fingerprint is
 * each page's last-updated time, so a page is re-sent only when it changes.
 */
@Injectable()
export class DiscoveryJob {
  private readonly logger = new Logger(DiscoveryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hotspots: HotspotsService,
    private readonly indexNow: IndexNowService,
  ) {}

  @Cron('0 15,45 * * * *')
  async run(): Promise<void> {
    try {
      const { data: stories } = await this.hotspots.listStories();
      const since = new Date(Date.now() - 7 * 24 * 3600_000);
      const digests = await this.prisma.dailyDigest.findMany({
        where: { createdAt: { gte: since } },
        select: { date: true, createdAt: true },
      });
      const entries = [
        ...stories.map((s) => ({ url: this.indexNow.url(`/story/${s.clusterKey}`), fingerprint: s.lastUpdatedAt })),
        ...digests.map((d) => ({ url: this.indexNow.url(`/digest/${d.date}`), fingerprint: d.createdAt.toISOString() })),
      ];
      await this.indexNow.submitChanged(entries);
    } catch (err) {
      this.logger.warn(`Discovery push failed: ${err instanceof Error ? err.message : err}`);
    }
  }
}
