import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import type OpenAI from 'openai';
import { createLlmClient } from '../utils/llm-client';
import { composeDigestItems, pickSupplements, REPEAT_WINDOW_DAYS, SUPPLEMENT_MIN_SOURCES, summariseDay } from '../utils/digest-compose';
import { ANTI_HALLUCINATION_RULES, UNTRUSTED_NOTE, isChineseText } from '../utils/writing-rules';
import { AiService } from '../services/ai.service';

/** The digest prompt is long and its answer is ~4000 tokens; give it more than the client's default. */
const DIGEST_TIMEOUT_MS = 180_000;

export interface DigestHighlight {
  title: string;
  summary: string;
  whyImportant: string;
  affects: string[];
  source: string;
  url: string;
  /** The event this item belongs to, when other sources covered it too (filled by rule, not the model). */
  event?: DigestEventRef;
}

export interface DigestEventRef {
  /** clusterKey; the event page is /story/<key>. */
  key: string;
  /** Other sources on the same event, by source id. */
  otherSources: string[];
}

/** One-line entry after the main list ("快讯"): ranked by rule, written by no model. */
export interface DigestBrief {
  title: string;
  source: string;
  url: string;
  /** Event page key when 2+ sources covered it. */
  storyKey?: string;
}

export interface DigestSimpleItem {
  title: string;
  summary: string;
  source: string;
  url: string;
}

export interface DigestModelItem {
  model: string;
  change: string;
  detail: string;
  impact: string;
}

export interface DigestPaperItem {
  title: string;
  summary: string;
  impact: string;
  source: string;
  url: string;
}

export interface DigestData {
  summary: string;
  highlights: DigestHighlight[];
  domestic: DigestSimpleItem[];
  international: DigestSimpleItem[];
  modelIntel: DigestModelItem[];
  products: DigestSimpleItem[];
  community: DigestSimpleItem[];
  papers: DigestPaperItem[];
  /** 快讯: events ranked below the main list. Absent on digests made before v0.13.0. */
  briefs?: DigestBrief[];
  generatedAt: string;
  itemCount: number;
  /**
   * True when the model call failed and the digest was assembled by rule from
   * item titles and summaries (fallbackDigest). Such a digest is regenerated
   * by retryFallbackDigest.
   */
  fallback?: boolean;
}

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    // Same queue and 429 retries as every other model call. Calling the client
    // directly let the 08:05 digest race the 08:00 scan on a one-at-a-time
    // free tier, and the rejected call fell back to the rule-based digest.
    @Optional() private readonly ai?: AiService,
  ) {
    this.client = createLlmClient();
    this.model = process.env.MODEL_NAME ?? 'qwen-coder-turbo';
  }

  getBeijingDatePublic(): string { return this.getBeijingDate(); }

  private getBeijingDate(offsetDays = 0): string {
    const now = new Date();
    const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000 + offsetDays * 86400000);
    return beijing.toISOString().slice(0, 10);
  }

  /** Add `offsetDays` to a YYYY-MM-DD calendar date string.
   *  Parse as UTC midnight so getUTCDate()/toISOString() operate on the same
   *  calendar date as the input. Using a +08:00 offset here shifted the UTC
   *  instant back to the previous day, so the result was off by one — the
   *  digest ended up summarizing two days prior instead of one. */
  private shiftDate(date: string, offsetDays: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  async generateDigest(date: string): Promise<void> {
    // The digest dated `date` summarizes the *previous* Beijing day's hotspots
    // — matches TLDR-style morning newsletter convention. When the 08:00 cron
    // fires on day N, the "day N digest" is what users open and it covers
    // everything that happened on day N-1.
    const contentDate = this.shiftDate(date, -1);
    const dateStart = new Date(`${contentDate}T00:00:00+08:00`);
    const dateEnd = new Date(`${contentDate}T23:59:59+08:00`);

    // Select by real publish time, not scrape time. An item published on a
    // prior day but scraped late (createdAt lands in this window) would
    // otherwise leak into the wrong digest — same bug already fixed in
    // curated.service. Fall back to createdAt only for items that genuinely
    // have no publishedAt (rare).
    const dateWindow = {
      OR: [
        { publishedAt: { gte: dateStart, lte: dateEnd } },
        { AND: [{ publishedAt: null }, { createdAt: { gte: dateStart, lte: dateEnd } }] },
      ],
    };

    // Get the previous day's hotspots — prefer curated, fallback to all
    let items = await this.prisma.hotspot.findMany({
      where: { isCurated: true, isClusterMain: true, ...dateWindow },
      orderBy: { qualityScore: 'desc' },
      take: 80,
    });

    if (items.length < 5) {
      items = await this.prisma.hotspot.findMany({
        where: { ...dateWindow },
        orderBy: { qualityScore: 'desc' },
        take: 80,
      });
    }

    // Every report that day, curated or not: how widely each event was covered,
    // and whether the company itself posted. Score 0 means "not AI" (pre-filter).
    const dayReports = await this.prisma.hotspot.findMany({
      where: { clusterKey: { not: null }, qualityScore: { gt: 0 }, ...dateWindow },
      take: 2000,
    });
    const dayEvents = summariseDay(dayReports);
    const supplements = pickSupplements(dayReports, items, dayEvents);
    if (supplements.length > 0) {
      this.logger.log(`[Digest] ${supplements.length} event(s) added for first-party report + ${SUPPLEMENT_MIN_SOURCES}+ sources`);
      items = [...items, ...supplements];
    }

    const { main, briefs } = await this.composeItems(items, date, dayEvents);
    items = main;

    let data: DigestData;
    if (main.length === 0) {
      data = this.emptyDigest(date, 0);
    } else if (!process.env.OPENAI_API_KEY) {
      data = this.fallbackDigest(main, date);
    } else {
      data = await this.generateAiDigest(main, date);
    }
    if (main.length > 0) {
      const events = await this.eventRefs([...main, ...briefs]);
      data.highlights = data.highlights.map((h) => {
        const key = main.find((m) => m.url === h.url)?.clusterKey;
        const event = key ? events.get(key) : undefined;
        return event ? { ...h, event } : h;
      });
      data.briefs = briefs.map((b) => ({
        title: b.titleZh || b.title,
        source: b.source,
        url: b.url,
        ...(b.clusterKey && events.has(b.clusterKey) ? { storyKey: b.clusterKey } : {}),
      }));
      data.itemCount = main.length + briefs.length;
    }

    await this.prisma.dailyDigest.upsert({
      where: { date },
      create: { date, data: JSON.stringify(data) },
      update: { data: JSON.stringify(data) },
    });

    this.logger.log(`Digest generated for ${date} (${data.itemCount} items)`);
  }

  /**
   * Events among `items` that 2+ sources covered, with the other sources' ids.
   * Lets a highlight point to its event page and say who else reported it.
   */
  private async eventRefs(items: Array<{ clusterKey: string | null; source: string }>): Promise<Map<string, DigestEventRef>> {
    const keys = [...new Set(items.map((i) => i.clusterKey).filter(Boolean))] as string[];
    if (keys.length === 0) return new Map();
    const members = await this.prisma.hotspot.findMany({
      where: { clusterKey: { in: keys }, qualityScore: { gt: 0 } },
      select: { clusterKey: true, source: true },
    });
    const sources = new Map<string, Set<string>>();
    for (const m of members) {
      const set = sources.get(m.clusterKey!) ?? new Set<string>();
      set.add(m.source);
      sources.set(m.clusterKey!, set);
    }
    const out = new Map<string, DigestEventRef>();
    for (const item of items) {
      const key = item.clusterKey;
      const set = key ? sources.get(key) : undefined;
      if (!key || !set || set.size < 2) continue;
      out.set(key, { key, otherSources: [...set].filter((s) => s !== item.source).slice(0, 6) });
    }
    return out;
  }

  /**
   * Rule-based pre-selection (utils/digest-compose.ts): one item per event,
   * ranked by importance; events from the last week only with news; at most 2
   * per source. Main items go to the model; briefs are listed as they are.
   */
  private async composeItems<T extends { url: string; source: string; clusterKey: string | null; qualityScore: number | null; id: string }>(
    items: T[],
    date: string,
    dayEvents: ReturnType<typeof summariseDay>,
  ): Promise<{ main: T[]; briefs: T[] }> {
    if (items.length === 0) return { main: [], briefs: [] };

    // Recent digests store URLs, not cluster keys: map their URLs back via hotspots.
    const recent = await this.prisma.dailyDigest.findMany({
      where: { date: { lt: date, gte: this.shiftDate(date, -REPEAT_WINDOW_DAYS) } },
      select: { data: true },
    });
    const recentUrls = new Set<string>();
    for (const d of recent) {
      try {
        const dd = JSON.parse(d.data) as Partial<DigestData>;
        for (const arr of [dd.highlights, dd.domestic, dd.international, dd.products, dd.community, dd.papers, dd.briefs]) {
          for (const x of arr ?? []) if (x?.url) recentUrls.add(x.url);
        }
      } catch { /* skip malformed */ }
    }
    const recentClusterKeys = new Set<string>();
    if (recentUrls.size > 0) {
      const rows = await this.prisma.hotspot.findMany({
        where: { url: { in: [...recentUrls] }, clusterKey: { not: null } },
        select: { clusterKey: true },
      });
      for (const r of rows) if (r.clusterKey) recentClusterKeys.add(r.clusterKey);
    }

    const keys = [...new Set(items.map((h) => h.clusterKey).filter(Boolean))] as string[];
    const sourceCount = new Map<string, number>();
    if (keys.length > 0) {
      const members = await this.prisma.hotspot.findMany({
        where: { clusterKey: { in: keys } },
        select: { clusterKey: true, source: true },
      });
      const sets = new Map<string, Set<string>>();
      for (const m of members) {
        if (!m.clusterKey) continue;
        const set = sets.get(m.clusterKey) ?? new Set<string>();
        set.add(m.source);
        sets.set(m.clusterKey, set);
      }
      for (const [k, set] of sets) sourceCount.set(k, set.size);
    }

    const { main, briefs } = composeDigestItems(items, recentClusterKeys, sourceCount, dayEvents);
    this.logger.log(`[Digest] composed ${main.length} main + ${briefs.length} briefs from ${items.length} candidates`);
    return { main, briefs };
  }

  /** Runs every morning at 08:05 Beijing time (5 minutes after the 08:00 scan),
   *  generating the digest dated *today*. By convention (see generateDigest)
   *  this digest summarizes the just-completed previous Beijing day.
   *
   *  The 5-minute delay ensures the 08:00 hotspot scan completes first, so the
   *  digest includes the latest overnight data. HotspotScheduler runs at 08:00
   *  (via its cron); typical scan duration is 1-3 minutes, so 08:05 provides a
   *  safe margin without making users wait too long for the morning digest.
   *
   *  Pinning the timezone explicitly so this works regardless of the server's
   *  local TZ (Docker images often default to UTC, dev machines vary). */
  // Keep this decorator directly on scheduledDigest. It once ended up on
  // composeItems (a helper inserted between it and this method), so the 08:05
  // run called composeItems() with no arguments and no digest was generated.
  @Cron('0 5 8 * * *', { timeZone: 'Asia/Shanghai' })
  async scheduledDigest(): Promise<void> {
    const today = this.getBeijingDate(0);
    await this.generateDigest(today);
  }

  /**
   * Today's digest fell back to the rule-based version (model call failed):
   * try the model again at 08:35 and 09:35, when the morning scans are done.
   * At most two extra calls a day, and none on days the 08:05 run worked.
   */
  @Cron('0 35 8,9 * * *', { timeZone: 'Asia/Shanghai' })
  async retryFallbackDigest(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) return;
    const today = this.getBeijingDate(0);
    const row = await this.prisma.dailyDigest.findUnique({ where: { date: today } });
    if (!row) return;
    let fallback = false;
    try {
      fallback = Boolean((JSON.parse(row.data) as DigestData).fallback);
    } catch {
      return;
    }
    if (!fallback) return;
    this.logger.log(`[Digest] ${today} is the rule-based fallback; asking the model again`);
    await this.generateDigest(today);
  }

  async getDigestByDate(date: string) {
    const digest = await this.prisma.dailyDigest.findUnique({ where: { date } });
    if (!digest) return null;
    return { date: digest.date, data: JSON.parse(digest.data) as DigestData, createdAt: digest.createdAt };
  }

  async getTodayDigest() {
    return this.getDigestByDate(this.getBeijingDate());
  }

  async getRecentDigests(days = 62) {
    const digests = await this.prisma.dailyDigest.findMany({
      orderBy: { date: 'desc' },
      take: days,
    });
    return digests.map((d) => {
      let summary = '';
      try {
        const data = JSON.parse(d.data) as { summary?: string };
        summary = data.summary ?? '';
      } catch {}
      return { date: d.date, summary, createdAt: d.createdAt };
    });
  }

  // ── AI generation ──────────────────────────────────────────────────────────

  private async generateAiDigest(items: any[], date: string): Promise<DigestData> {
    const fallback = this.fallbackDigest(items, date);
    try {
      const numbered = items
        .slice(0, 60)
        .map((h, i) => {
          const parts = [
            `${i + 1}. 【${h.titleZh || h.title}】`,
            h.summary ? `摘要：${h.summary.slice(0, 100)}` : '',
            `来源：${h.source}`,
            h.category ? `分类：${h.category}` : '',
            h.region ? `地区：${h.region}` : '',
            `链接：${h.url}`,
          ].filter(Boolean);
          return parts.join(' | ');
        })
        .join('\n');

      const systemPrompt = `你是 AI 行业资深分析师，擅长写给开发者看的 AI 日报，风格类似 TLDR AI / Ben's Bites。
你的核心价值是：筛选 + 结构化 + 解读，不是简单复制新闻标题。
特别注意：每条重点新闻必须写清楚"为什么重要"和"影响哪些人/方向"，这是日报的差异化价值所在。
语言要求：所有输出文字（summary、title、whyImportant、affects 标签、detail 等）一律使用简体中文；原始资讯是英文时必须翻译/改写成中文，不要直接照抄英文标题。
${UNTRUSTED_NOTE}

${ANTI_HALLUCINATION_RULES}`;

      const userPrompt = `今天（${date}）收集到 ${items.length} 条 AI 资讯，请生成结构化日报。

资讯列表（已按重要性排好序：综合评分、当天报道它的独立来源数、是否有官方一手发布。越靠前越重要，highlights 优先从前面选）：
${numbered}

输出格式（只输出 JSON，不要 markdown 代码块，不要任何其他内容）：
{
  "summary": "一句话总结今日 AI 世界最大动态（20字以内，有观点）",
  "highlights": [
    {
      "title": "事件标题（点出主体：公司、产品或模型名；不用\"重磅\"\"炸裂\"等夸张词）",
      "summary": "一句话摘要（40字以内）",
      "whyImportant": "为什么重要——对AI行业/开发者的实际影响（60字以内，必须有洞察，不能泛泛而谈）",
      "affects": ["受影响方向1", "受影响方向2"],
      "source": "来源名",
      "url": "原文链接（必须来自输入数据）"
    }
  ],
  "domestic": [{"title":"","summary":"","source":"","url":""}],
  "international": [{"title":"","summary":"","source":"","url":""}],
  "modelIntel": [{"model":"模型名","change":"变化类型如新发布/降价/性能提升","detail":"30字以内详情","impact":"对行业影响"}],
  "products": [{"title":"","summary":"","source":"","url":""}],
  "community": [{"title":"","summary":"","source":"","url":""}],
  "papers": [{"title":"","summary":"这篇论文解决了什么问题（一句话）","impact":"对行业的影响","source":"","url":""}]
}

规则：
- summary：必须是简体中文短句（20字以内），不要用英文标题
- highlights：选最重要的 3-5 条，每条都必须填写 whyImportant（真正洞察，不要写"这标志着..."这种套话）和 affects（至少 2 个具体方向标签），不能留空。**重要：避免同一主题（如同一模型的多个相关报道）占据多个重点位，优先覆盖不同领域/公司的重大事件，确保重点的多样性**
- domestic：国内公司（阿里/腾讯/字节/百度/华为/DeepSeek/Kimi/商汤等），最多 8 条
- international：OpenAI/Anthropic/Google/Meta/xAI/Microsoft 等，最多 8 条
- modelIntel：涉及模型发布/更新/定价/Benchmark/Context Length 的，最多 6 条
- products：AI 工具产品（Cursor/Windsurf/Copilot/Lovable/Replit 等），最多 6 条
- community：社区热议/GitHub 爆款/开发者观点，最多 5 条
- papers：值得关注论文（一句话解释"解决了什么问题"），最多 4 条
- 所有 url 必须来自输入数据，不要编造
- affects 写具体方向，如"AI Coding"、"Agent开发"、"中文LLM"，不要写"所有人"`;

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ];
      let raw: string;
      if (this.ai) {
        raw = this.ai.cleanModelResponse(await this.ai.callRaw(messages, 4000, 'digest', DIGEST_TIMEOUT_MS));
      } else {
        const result = await this.client.chat.completions.create({ model: this.model, messages, temperature: 0.3, max_tokens: 4000 });
        const msg = result.choices?.[0]?.message;
        // MiMo/reasoning models: prefer content; fallback to reasoning_content if content is null
        raw = msg?.content || (msg as any)?.reasoning_content || '';
      }
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        this.logger.warn(`[Digest] Model output had no JSON (${raw.length} chars); using the rule-based digest`);
        return fallback;
      }

      const parsed = JSON.parse(match[0]) as Partial<DigestData>;

      // Guard against the model referencing items outside the input set.
      // Despite the prompt rule ("所有 url 必须来自输入数据"), the model
      // sometimes fabricates or misattributes a URL — e.g. surfacing a
      // prior-day article that was correctly excluded from the time window.
      // Drop any entry whose URL isn't in today's source items so the digest
      // never links out to content that doesn't belong to this day.
      const normUrl = (u?: string) => (u ?? '').trim().replace(/\/+$/, '');
      const validUrls = new Set(items.map((h) => normUrl(h.url)));
      // Source comes from our data, not the model: it tends to copy the title into it.
      const sourceByUrl = new Map(items.map((h) => [normUrl(h.url), h.source as string]));
      const keepByUrl = <T extends { url?: string; source?: string }>(arr?: T[]): T[] =>
        (arr ?? [])
          .filter((x) => validUrls.has(normUrl(x.url)))
          .map((x) => ({ ...x, source: sourceByUrl.get(normUrl(x.url)) ?? x.source }));

      const highlights = keepByUrl(parsed.highlights);
      const droppedHighlights = (parsed.highlights?.length ?? 0) - highlights.length;
      if (droppedHighlights > 0) {
        this.logger.warn(
          `[Digest] Dropped ${droppedHighlights} highlight(s) whose URL was not in the source set (model hallucination)`,
        );
      }

      return {
        summary: parsed.summary ?? fallback.summary,
        highlights,
        domestic: keepByUrl(parsed.domestic),
        international: keepByUrl(parsed.international),
        modelIntel: parsed.modelIntel ?? [],
        products: keepByUrl(parsed.products),
        community: keepByUrl(parsed.community),
        papers: keepByUrl(parsed.papers),
        generatedAt: new Date().toISOString(),
        itemCount: items.length,
      };
    } catch (err) {
      this.logger.error('[Digest] AI generation failed:', err);
      return fallback;
    }
  }

  private fallbackDigest(items: any[], date: string): DigestData {
    // Without the model nothing gets translated, so only items that already
    // have Chinese go in; a mostly-English digest reads worse than a short one.
    const zhTitle = (h: any): string => h.titleZh || (isChineseText(h.title) ? h.title : '');
    const zhSummary = (h: any): string => (isChineseText(h.summary) ? h.summary : '');
    items = items.filter((h) => zhTitle(h));
    const pick = (cat: string, region?: string) =>
      items
        .filter((h) => (!cat || h.category === cat) && (!region || h.region === region))
        .slice(0, 8)
        .map((h) => ({ title: zhTitle(h), summary: zhSummary(h), source: h.source, url: h.url }));

    // Build a fallback summary that actually conveys what happened today by
    // pulling the top 1–2 hotspot titles instead of just reporting a count.
    const top = items.slice(0, 2).map((h) => zhTitle(h).replace(/\s+/g, ' ').trim()).filter(Boolean);
    const summary =
      top.length === 0
        ? `共收录 ${items.length} 条 AI 资讯`
        : top.length === 1
          ? `${top[0]}（共 ${items.length} 条）`
          : `${top[0]}；${top[1]}（共 ${items.length} 条）`;

    return {
      summary,
      fallback: true,
      highlights: items.slice(0, 5).map((h) => ({
        title: zhTitle(h),
        summary: zhSummary(h),
        whyImportant: '',
        affects: [],
        source: h.source,
        url: h.url,
      })),
      domestic: pick('', 'domestic'),
      international: pick('', 'international'),
      modelIntel: items
        .filter((h) => h.category === 'model')
        .slice(0, 6)
        .map((h) => ({ model: zhTitle(h).slice(0, 20), change: '更新', detail: zhSummary(h).slice(0, 40), impact: '' })),
      products: pick('product'),
      community: pick('community'),
      papers: pick('research').map((p) => ({ ...p, impact: '' })),
      generatedAt: new Date().toISOString(),
      itemCount: items.length,
    };
  }

  private emptyDigest(date: string, itemCount: number): DigestData {
    return {
      summary: '',
      highlights: [],
      domestic: [],
      international: [],
      modelIntel: [],
      products: [],
      community: [],
      papers: [],
      generatedAt: new Date().toISOString(),
      itemCount,
    };
  }
}
