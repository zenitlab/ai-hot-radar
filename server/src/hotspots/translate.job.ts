import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../services/ai.service';
import { TRANSLATE_BATCH, buildTranslateMessages, parseTranslations, translationNeeds } from '../utils/translate';
import { RSS_FEEDS } from '../rss-feeds/feeds.config';

/** Feed display name by source key, so "OpenAI" in a translation of an OpenAI feed item isn't flagged as unsupported. */
const FEED_NAME = new Map(RSS_FEEDS.map((f) => [`rss_${f.category}`, f.name]));

/** Only recent items: older ones have left the homepage and feeds. */
const WINDOW_MS = 72 * 3600_000;
/** Newest items scanned per run for missing Chinese; most already have it. */
const SCAN_LIMIT = 600;

/**
 * Fills in Chinese titles and summaries the scoring step didn't produce, so
 * readers don't hit English headlines on a Chinese site. Runs at :20 and :50,
 * between scans, and spends at most TRANSLATE_PER_RUN / 20 model calls a run
 * (default 1). TRANSLATE_PER_RUN=0 turns it off.
 *
 * An item is tried once per process: if the model's text fails the guards,
 * the original stays rather than retrying every half hour.
 */
@Injectable()
export class TranslateJob {
  private readonly logger = new Logger(TranslateJob.name);
  private readonly perRun = Math.max(0, Number(process.env.TRANSLATE_PER_RUN ?? TRANSLATE_BATCH) || 0);
  private readonly tried = new Set<string>();
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  @Cron('0 20,50 * * * *')
  async run(): Promise<void> {
    if (this.perRun === 0 || !process.env.OPENAI_API_KEY || this.running) return;
    this.running = true;
    try {
      const rows = await this.prisma.hotspot.findMany({
        where: { createdAt: { gte: new Date(Date.now() - WINDOW_MS) }, qualityScore: { gt: 0 } },
        orderBy: [{ isCurated: 'desc' }, { createdAt: 'desc' }],
        take: SCAN_LIMIT,
        select: { id: true, title: true, titleZh: true, summary: true, content: true, source: true, authorName: true },
      });
      const todo = rows
        .filter((h) => !this.tried.has(h.id) && Object.values(translationNeeds(h)).some(Boolean))
        .slice(0, this.perRun)
        .map((h) => ({ ...h, authorName: h.authorName || FEED_NAME.get(h.source) || null }));
      if (todo.length === 0) return;

      let written = 0;
      for (let i = 0; i < todo.length; i += TRANSLATE_BATCH) {
        const batch = todo.slice(i, i + TRANSLATE_BATCH);
        batch.forEach((h) => this.tried.add(h.id));
        let raw: string;
        try {
          raw = this.ai.cleanModelResponse(await this.ai.callRaw(buildTranslateMessages(batch), 3000, 'translate'));
        } catch (err) {
          // Provider error: let these items be tried again next run.
          batch.forEach((h) => this.tried.delete(h.id));
          this.logger.warn(`Translate: call failed: ${err instanceof Error ? err.message : err}`);
          continue;
        }
        const results = parseTranslations(raw, batch);
        for (const [id, data] of results) {
          await this.prisma.hotspot.update({ where: { id }, data });
          written++;
        }
      }
      this.logger.log(`Translate: ${written}/${todo.length} item(s) now have Chinese`);
    } catch (err) {
      this.logger.warn(`Translate run failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.running = false;
    }
  }
}
