import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TOPICS, TOPIC_GROUPS, matchesTopic, topicPattern, type TopicDef } from './topics.config';

/** Topic pages look back this far. */
const WINDOW_DAYS = 30;
/** "近期焦点" looks back this far. */
const FOCUS_DAYS = 14;
const FOCUS_SIZE = 5;
const PAGE_SIZE = 20;
/** The curated set and its matches are recomputed at most this often. */
const CACHE_MS = 10 * 60_000;

type Row = {
  id: string;
  title: string;
  titleZh: string | null;
  summary: string | null;
  recommendReason: string | null;
  tags: string | null;
  category: string | null;
  source: string;
  sourceTier: string | null;
  authorName: string | null;
  qualityScore: number | null;
  clusterKey: string | null;
  url: string;
  publishedAt: Date | null;
  createdAt: Date;
};

const when = (r: Row) => (r.publishedAt ?? r.createdAt).getTime();

/**
 * Topic lists and pages over the last 30 days of curated items. Membership is
 * computed in memory from topics.config.ts; a few thousand rows a month makes
 * that cheaper than per-topic SQL and keeps the matching rules in one place.
 */
@Injectable()
export class TopicsService {
  private cache: { at: number; rows: Row[]; byTopic: Map<string, Row[]>; sourcesByCluster: Map<string, Set<string>> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private async load() {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache;
    const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
    const rows: Row[] = await this.prisma.hotspot.findMany({
      where: { isCurated: true, isClusterMain: true, createdAt: { gte: since } },
      select: {
        id: true, title: true, titleZh: true, summary: true, recommendReason: true, tags: true,
        category: true, source: true, sourceTier: true, authorName: true, qualityScore: true,
        clusterKey: true, url: true, publishedAt: true, createdAt: true,
      },
    });
    rows.sort((a, b) => when(b) - when(a));

    const byTopic = new Map<string, Row[]>();
    for (const t of TOPICS) {
      const re = t.terms ? topicPattern(t.terms) : undefined;
      byTopic.set(t.slug, rows.filter((r) => matchesTopic(t, r, re)));
    }

    // Distinct sources per event, counting uncurated reports too.
    const keys = [...new Set(rows.map((r) => r.clusterKey).filter(Boolean))] as string[];
    const members = keys.length
      ? await this.prisma.hotspot.findMany({
          where: { clusterKey: { in: keys }, qualityScore: { gt: 0 } },
          select: { clusterKey: true, source: true },
        })
      : [];
    const sourcesByCluster = new Map<string, Set<string>>();
    for (const m of members) {
      const set = sourcesByCluster.get(m.clusterKey!) ?? new Set<string>();
      set.add(m.source);
      sourcesByCluster.set(m.clusterKey!, set);
    }

    this.cache = { at: Date.now(), rows, byTopic, sourcesByCluster };
    return this.cache;
  }

  private card(t: TopicDef, items: Row[]) {
    const latest = items[0];
    return {
      slug: t.slug,
      name: t.name,
      group: t.group,
      description: t.description,
      count: items.length,
      latest: latest ? { id: latest.id, title: latest.titleZh || latest.title } : null,
    };
  }

  async list() {
    const { byTopic } = await this.load();
    return {
      windowDays: WINDOW_DAYS,
      groups: TOPIC_GROUPS.map((g) => ({
        ...g,
        topics: TOPICS.filter((t) => t.group === g.group).map((t) => this.card(t, byTopic.get(t.slug) ?? [])),
      })),
    };
  }

  /** Topic slugs with enough items to be worth indexing, for the sitemap. */
  async indexable(min = 3) {
    const { byTopic } = await this.load();
    return TOPICS.filter((t) => (byTopic.get(t.slug)?.length ?? 0) >= min).map((t) => ({
      slug: t.slug,
      lastUpdatedAt: new Date(when(byTopic.get(t.slug)![0])).toISOString(),
    }));
  }

  async detail(slug: string, pageRaw = '1') {
    const topic = TOPICS.find((t) => t.slug === slug);
    if (!topic) return null;
    const { byTopic, sourcesByCluster } = await this.load();
    const items = byTopic.get(slug) ?? [];
    const sourcesOf = (r: Row) => (r.clusterKey ? sourcesByCluster.get(r.clusterKey) : undefined) ?? new Set([r.source]);

    // 近期焦点: this topic's events of the last two weeks that the most sources covered.
    const focusSince = Date.now() - FOCUS_DAYS * 86400_000;
    const focus = items
      .filter((r) => when(r) >= focusSince && sourcesOf(r).size >= 2)
      .sort((a, b) => sourcesOf(b).size - sourcesOf(a).size || (b.qualityScore ?? 0) - (a.qualityScore ?? 0))
      .slice(0, FOCUS_SIZE)
      .map((r) => ({ id: r.id, title: r.titleZh || r.title, sourceCount: sourcesOf(r).size, clusterKey: r.clusterKey }));

    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const page = Math.min(Math.max(parseInt(pageRaw) || 1, 1), totalPages);
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => {
      const others = [...sourcesOf(r)].filter((s) => s !== r.source);
      return {
        id: r.id,
        title: r.title,
        titleZh: r.titleZh,
        summary: r.summary,
        recommendReason: r.recommendReason,
        tags: r.tags,
        category: r.category,
        source: r.source,
        sourceTier: r.sourceTier,
        authorName: r.authorName,
        qualityScore: r.qualityScore,
        url: r.url,
        publishedAt: r.publishedAt,
        createdAt: r.createdAt,
        clusterKey: r.clusterKey,
        otherSources: others.slice(0, 5),
        otherSourceCount: others.length,
      };
    });

    // Related: the topics sharing the most items with this one.
    const ids = new Set(items.map((r) => r.id));
    const related = TOPICS.filter((t) => t.slug !== slug)
      .map((t) => ({ t, shared: (byTopic.get(t.slug) ?? []).filter((r) => ids.has(r.id)).length }))
      .filter((x) => x.shared >= 2)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 4)
      .map(({ t }) => ({ slug: t.slug, name: t.name }));

    return {
      topic: { slug: topic.slug, name: topic.name, group: topic.group, description: topic.description },
      windowDays: WINDOW_DAYS,
      count: items.length,
      focus,
      items: pageItems,
      pagination: { page, totalPages, pageSize: PAGE_SIZE },
      related,
    };
  }
}
