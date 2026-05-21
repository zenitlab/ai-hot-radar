import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { AiService } from './ai.service';
import {
  SourceTier,
  TIER_MULTIPLIER,
  CURATED_THRESHOLD,
  SEARCH_SOURCE_TIER,
} from '../rss-feeds/feeds.config';

export interface PreFilterResult {
  isAiRelated: boolean;
  category: string; // model|product|industry|research|community|tips
  region: string;   // domestic|international
}

export interface FiveDimScore {
  relevToAi: number;  // 0-10
  novelty: number;    // 0-10
  audience: number;   // 0-10
  quality: number;    // 0-10
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  tags: string[];
}

export interface ScoringResult extends FiveDimScore {
  qualityScore: number;   // 0-100 final score
  isCurated: boolean;
  clusterKey: string;
  category: string;
  region: string;
}

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly aiService: AiService) {}

  /** Determine source tier from source string */
  getSourceTier(source: string, isVerifiedTwitter = false): SourceTier {
    if (source.startsWith('rss_')) {
      // RSS source tier is in feeds.config; caller should pass it directly
      return 'T2';
    }
    if (source === 'twitter' && isVerifiedTwitter) return 'T1.5';
    return (SEARCH_SOURCE_TIER[source] as SourceTier) || 'T2';
  }

  /** Compute cluster key from title (first 30 chars, lowercased, no spaces) */
  computeClusterKey(title: string): string {
    const normalized = title.slice(0, 30).toLowerCase().replace(/\s+/g, '');
    return createHash('md5').update(normalized).digest('hex').slice(0, 16);
  }

  /** Step 1: Pre-filter — is this content AI-related? */
  async preFilter(title: string, content: string): Promise<PreFilterResult> {
    const snippet = `标题: ${title}\n内容: ${content.slice(0, 200)}`;

    try {
      const response = await this.aiService.callRaw([
        {
          role: 'system',
          content: `你是AI资讯分类助手。判断给定内容是否与AI行业相关，并分类。
输出严格JSON格式，不要有其他文字：
{"isAiRelated":true/false,"category":"model|product|industry|research|community|tips","region":"domestic|international"}

category说明：
- model: AI模型发布/更新/研究
- product: AI产品/应用/工具发布
- industry: AI行业动态/政策/商业
- research: AI学术论文/研究
- community: 技术社区讨论/开发者内容
- tips: 使用技巧/教程/经验

region说明：
- domestic: 中国国内内容
- international: 国际内容`,
        },
        { role: 'user', content: snippet },
      ], 400, 'preFilter');

      const json = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());
      return {
        isAiRelated: Boolean(json.isAiRelated),
        category: json.category || 'industry',
        region: json.region || 'international',
      };
    } catch {
      // Fallback: assume related if pre-filter fails
      return { isAiRelated: true, category: 'industry', region: 'international' };
    }
  }

  /** Step 2: 5-dimension scoring */
  async scoreFiveDim(
    title: string,
    content: string,
    tier: SourceTier,
    preFilter: PreFilterResult,
    publishedAt?: Date,
  ): Promise<FiveDimScore> {
    // Tell the model how recent the item is so it doesn't mark a 6-month-old GPT-5
    // article as urgent when surfaced today by Bing.
    let ageHint = '';
    if (publishedAt) {
      const ageDays = Math.floor((Date.now() - publishedAt.getTime()) / 86400000);
      const dateStr = publishedAt.toISOString().slice(0, 10);
      if (ageDays >= 30) {
        ageHint = `\n发布时间: ${dateStr}（距今约 ${ageDays} 天，是旧内容，importance 严格按"今天回看是否仍重要"评估，绝大多数情况只能是 low/medium）`;
      } else if (ageDays >= 7) {
        ageHint = `\n发布时间: ${dateStr}（距今约 ${ageDays} 天，importance 应保守评估，避免过高）`;
      } else {
        ageHint = `\n发布时间: ${dateStr}（距今 ${ageDays} 天）`;
      }
    }
    const snippet = `标题: ${title}\n内容: ${content.slice(0, 600)}\n来源等级: ${tier}\n内容分类: ${preFilter.category}${ageHint}`;

    try {
      const response = await this.aiService.callRaw([
        {
          role: 'system',
          content: `你是AI资讯质量评估专家。对给定内容进行5个维度评分（每项0-10整数）。
输出严格JSON，不要有其他文字：
{
  "relevToAi": 0-10,
  "novelty": 0-10,
  "audience": 0-10,
  "quality": 0-10,
  "importance": "low|medium|high|urgent",
  "summary": "一句话中文摘要（30字以内，论文请概括核心贡献）",
  "tags": ["标签1","标签2"]
}

评分维度：
- relevToAi: 与AI行业直接相关性（10=AI核心内容，0=完全无关）
- novelty: 信息新颖性（10=全新突破/首次发布/新论文，0=重复旧内容）
- audience: AI从业者关注价值（10=必读，5=有参考，0=无价值）
- quality: 内容深度（10=深度分析/原创研究，5=正常报道，0=标题党）

importance标准：
- urgent: 影响整个行业的重大事件（GPT-5/Claude 4发布级别）
- high: 重要动态（知名公司新模型/产品/重大融资/>5亿美元）
- medium: 有参考价值的资讯、一般论文
- low: 日常教程/一般讨论/边缘信息

tags: 1-3个简短中文标签（论文请标注研究方向如：Agent/RAG/多模态/推理）`,
        },
        { role: 'user', content: snippet },
      ], 400, 'scoreFiveDim');

      const json = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim());
      const importance = ['low', 'medium', 'high', 'urgent'].includes(json.importance)
        ? json.importance
        : 'low';
      let summary = String(json.summary || '').slice(0, 100);

      // For urgent items, double-check the summary is grounded in the content.
      // Costs ~1 extra cheap AI call per urgent item (rare — a few per day at most),
      // but prevents fabricated details on the most-trusted importance level.
      if (importance === 'urgent' && summary) {
        const grounded = await this.aiService.checkSummaryGrounded(content, summary);
        if (!grounded) {
          this.logger.warn(`Urgent summary failed grounding check, falling back to content slice`);
          summary = content.slice(0, 80).trim();
        }
      }

      return {
        relevToAi: Math.min(10, Math.max(0, Number(json.relevToAi) || 0)),
        novelty: Math.min(10, Math.max(0, Number(json.novelty) || 0)),
        audience: Math.min(10, Math.max(0, Number(json.audience) || 0)),
        quality: Math.min(10, Math.max(0, Number(json.quality) || 0)),
        importance,
        summary,
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 3).map(String) : [],
      };
    } catch {
      return {
        relevToAi: 5, novelty: 5, audience: 5, quality: 5,
        importance: 'low', summary: '', tags: [],
      };
    }
  }

  /** Step 3: Code-computed final quality score */
  computeQualityScore(dims: FiveDimScore, tier: SourceTier): number {
    const raw =
      dims.relevToAi * 3.0 +
      dims.novelty * 3.0 +
      dims.audience * 2.5 +
      dims.quality * 1.5;
    // raw max = 100, apply tier multiplier
    return Math.min(100, Math.round((raw / 100) * TIER_MULTIPLIER[tier] * 100));
  }

  /** Full scoring pipeline for a single item: pre-filter (cheap) → 5-dim scoring (only if AI-related) */
  async score(
    title: string,
    content: string,
    tier: SourceTier,
    defaultCategory?: string,
    publishedAt?: Date,
  ): Promise<ScoringResult> {
    const clusterKey = this.computeClusterKey(title);

    // T1 sources are always AI-related; skip pre-filter, go straight to scoring
    if (tier === 'T1') {
      const preFilter: PreFilterResult = {
        isAiRelated: true,
        category: defaultCategory || 'industry',
        region: 'international',
      };
      const dims = await this.scoreFiveDim(title, content, tier, preFilter, publishedAt);
      const qualityScore = this.computeQualityScore(dims, tier);
      return {
        ...dims,
        qualityScore,
        isCurated: qualityScore >= CURATED_THRESHOLD[tier],
        clusterKey,
        category: preFilter.category,
        region: preFilter.region,
      };
    }

    // T1.5 / T2: two-stage — cheap pre-filter first, only score if AI-related.
    // Saves ~30% of total time when ~50% of items are not AI-related (news aggregator sources etc.)
    const preFilter = await this.preFilter(title, content);
    if (defaultCategory) preFilter.category = defaultCategory;

    if (!preFilter.isAiRelated) {
      return {
        relevToAi: 0, novelty: 0, audience: 0, quality: 0,
        importance: 'low', summary: '', tags: [],
        qualityScore: 0, isCurated: false,
        clusterKey,
        category: preFilter.category,
        region: preFilter.region,
      };
    }

    const dims = await this.scoreFiveDim(title, content, tier, preFilter, publishedAt);
    const qualityScore = this.computeQualityScore(dims, tier);
    return {
      ...dims,
      qualityScore,
      isCurated: qualityScore >= CURATED_THRESHOLD[tier],
      clusterKey,
      category: preFilter.category,
      region: preFilter.region,
    };
  }
}
