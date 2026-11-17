import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../services/ai.service';
import { buildStoryDigestMessages, parseStoryDigest, storiesNeedingDigest } from '../utils/story-digest';
import { HotspotsService } from './hotspots.service';

/**
 * Writes the event overview shown on multi-source story pages.
 *
 * One AI call per story, and only for stories the sitemap lists (2+ sources).
 * STORY_DIGEST_PER_RUN caps calls per run (default 3, 0 turns it off) so a
 * backlog after first deploy drains over days instead of eating the LLM quota
 * that scoring needs.
 */
@Injectable()
export class StoryDigestJob {
  private readonly logger = new Logger(StoryDigestJob.name);
  private readonly perRun = Math.max(0, Number(process.env.STORY_DIGEST_PER_RUN ?? 3) || 0);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hotspots: HotspotsService,
    private readonly ai: AiService,
  ) {}

  // Offset from the :00/:30 scans and the :15/:45 search-engine push.
  @Cron('0 8,38 * * * *')
  async run(): Promise<void> {
    if (this.perRun === 0 || !process.env.OPENAI_API_KEY || this.running) return;
    this.running = true;
    try {
      const { data: stories } = await this.hotspots.listStories();
      const existing = await this.prisma.storyDigest.findMany({
        where: { clusterKey: { in: stories.map((s) => s.clusterKey) } },
        select: { clusterKey: true, sourceCount: true, updatedAt: true },
      });
      const keys = storiesNeedingDigest(stories, existing, this.perRun);
      let written = 0;
      for (const clusterKey of keys) {
        if (await this.write(clusterKey)) written++;
      }
      if (keys.length > 0) this.logger.log(`Story digest: ${written}/${keys.length} written`);
    } catch (err) {
      this.logger.warn(`Story digest run failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }

  private async write(clusterKey: string): Promise<boolean> {
    const items = await this.prisma.hotspot.findMany({
      where: { clusterKey },
      orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    if (items.length === 0) return false;
    const counts = { sourceCount: new Set(items.map((h) => h.source)).size, reportCount: items.length };

    let raw: string;
    try {
      raw = this.ai.cleanModelResponse(await this.ai.callRaw(buildStoryDigestMessages(items), 2000, 'storyDigest'));
    } catch (err) {
      // Provider error (rate limit, timeout): leave no row so the next run retries.
      this.logger.warn(`Story digest ${clusterKey}: call failed: ${err instanceof Error ? err.message : err}`);
      return false;
    }

    // An unusable answer is still recorded, with digest null, so the same story
    // isn't sent again every half hour; it gets another try when a new source joins.
    const text = parseStoryDigest(raw, items);
    if (!text) this.logger.warn(`Story digest ${clusterKey}: model output rejected`);
    const data = {
      title: text?.title || null,
      digest: text?.digest ?? null,
      points: text?.points ? JSON.stringify(text.points) : null,
      ...counts,
    };
    await this.prisma.storyDigest.upsert({ where: { clusterKey }, create: { clusterKey, ...data }, update: data });
    return Boolean(text);
  }
}
