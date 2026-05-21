import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

@Injectable()
export class EntitiesService {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private prisma: PrismaService) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseURL: process.env.OPENAI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    this.model = process.env.MODEL_NAME ?? 'qwen-coder-turbo';
  }

  async findAll() {
    const cards = await this.prisma.entityCard.findMany({
      include: { keyword: { select: { id: true, text: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const enriched = await Promise.all(
      cards.map(async (card) => ({
        ...card,
        todayMentions: await this.getTodayMentions(card.name),
        latestNews: await this.getLatestNews(card.name, 3),
      })),
    );
    return enriched;
  }

  async findOne(id: string) {
    const card = await this.prisma.entityCard.findUnique({
      where: { id },
      include: { keyword: { select: { id: true, text: true, isActive: true } } },
    });
    if (!card) throw new NotFoundException('Entity not found');
    const [trend, latestNews, relations] = await Promise.all([
      this.getTrend(card.name),
      this.getLatestNews(card.name, 8),
      this.getRelations(card.name),
    ]);
    return { ...card, trend, latestNews, relations };
  }

  async getGraph() {
    const [cards, relations] = await Promise.all([
      this.prisma.entityCard.findMany({ select: { name: true, type: true } }),
      this.prisma.entityRelation.findMany(),
    ]);

    const trackedNames = new Set(cards.map((c) => c.name));

    // Add satellite nodes from relatedData of tracked entities
    const allCards = await this.prisma.entityCard.findMany({ select: { name: true, type: true, relatedData: true } });
    const satelliteNodes: { name: string; type: string; isTracked: false }[] = [];
    const seenSatellites = new Set<string>(trackedNames);

    for (const card of allCards) {
      if (!card.relatedData) continue;
      try {
        const data = JSON.parse(card.relatedData) as { relatedCompanies?: string[]; relatedModels?: string[] };
        const candidates = [...(data.relatedCompanies ?? []), ...(data.relatedModels ?? [])].slice(0, 3);
        for (const name of candidates) {
          if (!seenSatellites.has(name)) {
            seenSatellites.add(name);
            satelliteNodes.push({ name, type: 'satellite', isTracked: false });
          }
        }
      } catch {}
    }

    const nodes = [
      ...cards.map((c) => ({ name: c.name, type: c.type ?? 'technology', isTracked: true })),
      ...satelliteNodes,
    ];

    const edges = relations.map((r) => ({
      id: `${r.fromName}-${r.toName}`,
      fromName: r.fromName,
      toName: r.toName,
      relation: r.relation,
    }));

    return { nodes, edges };
  }

  async createForKeyword(keywordId: string, name: string): Promise<void> {
    const existing = await this.prisma.entityCard.findUnique({ where: { keywordId } });
    if (existing) return;

    // Create placeholder immediately so frontend can show loading state
    const card = await this.prisma.entityCard.create({
      data: { keywordId, name, relatedData: null, lastRefresh: new Date() },
    });

    // Fill in AI profile (may take a few seconds)
    const entityData = await this.generateProfile(name);

    await this.prisma.entityCard.update({
      where: { id: card.id },
      data: {
        type: entityData.type,
        summary: entityData.summary,
        relatedData: JSON.stringify(entityData),
        lastRefresh: new Date(),
      },
    });

    await this.saveRelations(name, entityData);
  }

  async refresh(id: string) {
    const card = await this.prisma.entityCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Entity not found');

    const entityData = await this.generateProfile(card.name);

    await this.prisma.entityRelation.deleteMany({ where: { fromName: card.name } });
    await this.saveRelations(card.name, entityData);

    return this.prisma.entityCard.update({
      where: { id },
      data: {
        type: entityData.type,
        summary: entityData.summary,
        relatedData: JSON.stringify(entityData),
        lastRefresh: new Date(),
      },
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async generateProfile(name: string): Promise<EntityProfile> {
    const fallback: EntityProfile = {
      type: 'technology',
      summary: `${name} 是 AI 行业的相关实体。`,
      relatedCompanies: [],
      relatedModels: [],
      relatedProducts: [],
      competesWith: [],
      aliases: [],
      tags: [],
    };

    if (!process.env.OPENAI_API_KEY) return fallback;

    try {
      const result = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `你是 AI 行业知识助手。请为给定实体生成 JSON 格式的结构化档案。只输出 JSON，不要其他内容。

输出格式:
{
  "type": "model|company|product|technology|person",
  "summary": "2-3句简介，说明这是什么及其主要特点",
  "relatedCompanies": ["相关公司名（最多3个）"],
  "relatedModels": ["相关模型名（最多3个）"],
  "relatedProducts": ["集成/使用该实体的产品（最多5个）"],
  "competesWith": ["竞品名（最多3个）"],
  "aliases": ["常见别名（最多3个）"],
  "tags": ["标签1","标签2","标签3"]
}

只包含真实存在的实体，不确定的返回空数组。`,
          },
          { role: 'user', content: name },
        ],
        temperature: 0.2,
        max_tokens: 600,
      });

      const raw = result.choices[0]?.message?.content ?? '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) return fallback;
      const parsed = JSON.parse(match[0]) as Partial<EntityProfile>;
      return { ...fallback, ...parsed };
    } catch (err) {
      console.error('[Entities] AI generation error:', err);
      return fallback;
    }
  }

  private async saveRelations(name: string, data: EntityProfile): Promise<void> {
    const rels: { toName: string; relation: string }[] = [
      ...data.relatedCompanies.map((r) => ({ toName: r, relation: 'related_to' })),
      ...data.relatedModels.map((r) => ({ toName: r, relation: 'sibling_model' })),
      ...data.relatedProducts.map((r) => ({ toName: r, relation: 'integrated_by' })),
      ...data.competesWith.map((r) => ({ toName: r, relation: 'competes_with' })),
    ];

    for (const rel of rels) {
      if (!rel.toName || rel.toName === name) continue;
      try {
        await this.prisma.entityRelation.upsert({
          where: { fromName_toName: { fromName: name, toName: rel.toName } },
          create: { fromName: name, toName: rel.toName, relation: rel.relation },
          update: { relation: rel.relation },
        });
      } catch {}
    }
  }

  private async getTodayMentions(name: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.hotspot.count({
      where: {
        createdAt: { gte: today },
        OR: [{ title: { contains: name } }, { summary: { contains: name } }],
      },
    });
  }

  async getLatestNews(name: string, limit: number) {
    return this.prisma.hotspot.findMany({
      where: {
        qualityScore: { gte: 60 },
        OR: [{ title: { contains: name } }, { summary: { contains: name } }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, title: true, url: true, source: true, createdAt: true, summary: true },
    });
  }

  private async getTrend(name: string): Promise<{ date: string; count: number }[]> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const hotspots = await this.prisma.hotspot.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        OR: [{ title: { contains: name } }, { summary: { contains: name } }],
      },
      select: { createdAt: true },
    });

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const h of hotspots) {
      const key = h.createdAt.toISOString().slice(0, 10);
      if (key in byDay) byDay[key]++;
    }
    return Object.entries(byDay).map(([date, count]) => ({ date, count }));
  }

  private async getRelations(name: string) {
    return this.prisma.entityRelation.findMany({ where: { fromName: name } });
  }
}

interface EntityProfile {
  type: string;
  summary: string;
  relatedCompanies: string[];
  relatedModels: string[];
  relatedProducts: string[];
  competesWith: string[];
  aliases: string[];
  tags: string[];
}
