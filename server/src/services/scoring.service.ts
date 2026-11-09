import { Injectable, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { computeClusterKey } from '../utils/title-cluster';
import {
  SourceTier,
  CURATED_THRESHOLD,
  SEARCH_SOURCE_TIER,
} from '../rss-feeds/feeds.config';

export interface PreFilterResult {
  isAiRelated: boolean;
  category: string; // model|product|industry|research|community|tips
  region: string;   // domestic|international
}

/**
 * Content type decides how the five dimensions are weighted (borrowed from
 * AIHOT's selection-score prompt). A paper is judged mostly on substance, a
 * tool mostly on whether readers can use it, an industry event on reach.
 */
export type ContentType =
  | 'model_release' | 'product_launch' | 'tool_or_tip' | 'research_paper'
  | 'industry_event' | 'opinion' | 'tutorial';

/** Weights per type for [relevToAi, novelty, audience, quality, actionable]; each row sums to 10. */
export const TYPE_WEIGHTS: Record<ContentType, [number, number, number, number, number]> = {
  model_release:  [3, 2, 2, 2, 1],
  product_launch: [2, 2, 2, 1, 3],
  tool_or_tip:    [1, 2, 2, 1, 4],
  research_paper: [3, 3, 1, 2, 1],
  industry_event: [3, 1, 4, 2, 0],
  opinion:        [1, 3, 4, 1, 1],
  tutorial:       [1, 1, 3, 1, 4],
};

export interface FiveDimScore {
  contentType: ContentType;
  relevToAi: number;  // 0-10
  novelty: number;    // 0-10
  audience: number;   // 0-10
  quality: number;    // 0-10
  actionable: number; // 0-10, can a reader use / act on it
  importance: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  tags: string[];
  aiFailed?: boolean; // true = scoring call failed, scores are placeholders
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

  /** Compute cluster key from title (order-independent token-set hash; see title-cluster.ts) */
  computeClusterKey(title: string): string {
    return computeClusterKey(title);
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
      ], 1500, 'preFilter');

      const json = JSON.parse(this.aiService.cleanModelResponse(response));
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
  "contentType": "model_release|product_launch|tool_or_tip|research_paper|industry_event|opinion|tutorial",
  "relevToAi": 0-10,
  "novelty": 0-10,
  "audience": 0-10,
  "quality": 0-10,
  "actionable": 0-10,
  "importance": "low|medium|high|urgent",
  "summary": "一句话中文摘要（30字以内，论文请概括核心贡献）",
  "tags": ["标签1","标签2"]
}

评分维度：
- relevToAi: 与AI行业直接相关性（10=AI核心内容，0=完全无关）
- novelty: 信息新颖性（10=全新突破/首次发布/新论文，0=重复旧内容）
- audience: AI从业者关注价值（10=必读，5=有参考，0=无价值）
- quality: 内容深度（10=深度分析/原创研究，5=正常报道，0=标题党）
- actionable: 读者能否据此行动（10=可直接上手使用/有明确步骤，0=纯资讯无可操作内容）

contentType 选最贴切的一类：model_release 模型发布 / product_launch 产品发布 / tool_or_tip 工具或技巧 /
research_paper 论文研究 / industry_event 行业事件（融资、政策、人事、财报）/ opinion 观点评论 / tutorial 教程讲解

🚫 必须压住的噪声（命中则对应维度不得超过上限）：
- 例行小版本更新、bug 修复、文档改动 → novelty ≤ 3
- 营销软文、带货、课程推广 → quality ≤ 2，audience ≤ 3
- 只有预告、传闻、"即将发布"而无实质内容 → novelty ≤ 3
- 旧闻翻炒、换个标题重发 → novelty ≤ 2

📌 加分信号（命中以下任意一项，对应维度上调 1-2 分）：
1. 有可核实的一手证据（官方公告原文、可下载权重/代码、实测数据、论文全文）→ quality +1
   （不要因为署名是大厂或名校就加分，来源权威性由系统另行处理）
2. 主流 Benchmark SOTA 声明（MMLU / GPQA / SWE-bench / ARC-AGI / MATH /
   HumanEval / HellaSwag / MMMU / GSM8K / LiveCodeBench / AIDER）→ novelty + quality 各 +1
3. 提出新范式 / 新架构（非增量改进，例如 "introducing a new" / "novel framework"）
   → novelty +2
4. 同时命中以上 ≥2 项 → importance 至少 medium，可考虑 high

importance标准：
- urgent: 影响整个行业的重大事件（GPT-5/Claude 4发布级别）
- high: 重要动态（知名公司新模型/产品/重大融资/>5亿美元）
- medium: 有参考价值的资讯、一般论文
- low: 日常教程/一般讨论/边缘信息

tags: 1-3个简短中文标签（论文请标注研究方向如：Agent/RAG/多模态/推理）`,
        },
        { role: 'user', content: snippet },
      ], 1500, 'scoreFiveDim');

      const json = JSON.parse(this.aiService.cleanModelResponse(response));
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

      const dim = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));
      const contentType: ContentType = json.contentType in TYPE_WEIGHTS
        ? json.contentType
        : this.typeFromCategory(preFilter.category);
      return {
        contentType,
        relevToAi: dim(json.relevToAi),
        novelty: dim(json.novelty),
        audience: dim(json.audience),
        quality: dim(json.quality),
        // Older/simpler models may omit the new field; neutral 5 keeps scores comparable.
        actionable: json.actionable === undefined ? 5 : dim(json.actionable),
        importance,
        summary,
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 3).map(String) : [],
      };
    } catch {
      return {
        contentType: this.typeFromCategory(preFilter.category),
        relevToAi: 5, novelty: 5, audience: 5, quality: 5, actionable: 5,
        importance: 'low', summary: '', tags: [], aiFailed: true,
      };
    }
  }

  /** Step 3: Code-computed final quality score */
  computeQualityScore(dims: FiveDimScore, _tier: SourceTier): number {
    const w = TYPE_WEIGHTS[dims.contentType] ?? TYPE_WEIGHTS.industry_event;
    const raw =
      dims.relevToAi * w[0] +
      dims.novelty * w[1] +
      dims.audience * w[2] +
      dims.quality * w[3] +
      dims.actionable * w[4];
    // raw max = 100 (weights sum to 10, dims max 10). Tier only picks the
    // curation threshold (CURATED_THRESHOLD); it no longer inflates the score.
    return Math.min(100, Math.round(raw));
  }

  /** Fallback content type when the model gave none, from the pre-filter category. */
  typeFromCategory(category: string): ContentType {
    switch (category) {
      case 'model': return 'model_release';
      case 'product': return 'product_launch';
      case 'research': return 'research_paper';
      case 'tips': return 'tool_or_tip';
      case 'community': return 'opinion';
      default: return 'industry_event';
    }
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
        contentType: 'industry_event',
        relevToAi: 0, novelty: 0, audience: 0, quality: 0, actionable: 0,
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
