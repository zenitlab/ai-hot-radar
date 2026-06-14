import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import type { AIAnalysis } from '../types';

@Injectable()
export class AiService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly expansionCache = new Map<string, string[]>();

  private stats = { calls: 0, latencyMs: 0, promptTokens: 0, completionTokens: 0, errors: 0, retries: 0 };
  private callsByKind: Record<string, number> = {};

  // ── Global concurrency throttle ─────────────────────────────────────────
  // The provider determines how aggressive we can be:
  //   - DashScope/SiliconFlow/DeepSeek: usually fine at 10-15 concurrent
  //   - Xiaomi MiMo / smaller providers: 429 above ~3-5 concurrent
  // AI_MAX_CONCURRENT env var lets the user tune without code changes.
  private readonly maxConcurrent: number;
  private inFlight = 0;
  private waitQueue: Array<() => void> = [];

  // ── Token budget ────────────────────────────────────────────────────────
  // Reasoning models (MiMo / R1) burn through max_tokens inside <think>
  // before emitting the actual JSON. 1500-2000 is a safer floor than the
  // pre-reasoning-era 400-800. AI_MAX_TOKENS env var lets the user dial up
  // further for chains of thought that are particularly verbose.
  private readonly maxTokens: number;

  // ── 429 retry config ────────────────────────────────────────────────────
  private readonly maxRetries429: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseURL: process.env.OPENAI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      timeout: 60000, // 60s — reasoning models routinely sit on the connection for 15s+
      maxRetries: 0,  // we do our own 429-aware retry below
    });
    this.model = process.env.MODEL_NAME ?? 'qwen-coder-turbo';
    this.maxConcurrent = Math.max(1, Number(process.env.AI_MAX_CONCURRENT ?? 5));
    this.maxRetries429 = Math.max(0, Number(process.env.AI_MAX_RETRIES_429 ?? 3));
    this.maxTokens = Math.max(400, Number(process.env.AI_MAX_TOKENS ?? 1500));
  }

  resetStats(): void {
    this.stats = { calls: 0, latencyMs: 0, promptTokens: 0, completionTokens: 0, errors: 0, retries: 0 };
    this.callsByKind = {};
  }

  getStats() {
    return {
      ...this.stats,
      totalTokens: this.stats.promptTokens + this.stats.completionTokens,
      byKind: { ...this.callsByKind },
    };
  }

  /** Acquire one slot from the global AI request semaphore. Blocks if at limit. */
  private async acquire(): Promise<void> {
    if (this.inFlight < this.maxConcurrent) {
      this.inFlight++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waitQueue.push(() => {
        this.inFlight++;
        resolve();
      });
    });
  }

  private release(): void {
    this.inFlight--;
    const next = this.waitQueue.shift();
    if (next) next();
  }

  /** Sleep for `ms` ms, optionally with random jitter [0, jitter). */
  private sleep(ms: number, jitter = 500): Promise<void> {
    return new Promise((r) => setTimeout(r, ms + Math.floor(Math.random() * jitter)));
  }

  /**
   * Strip noise from a model's raw text response so JSON parsers see clean output.
   *
   * Reasoning models (DeepSeek-R1, Xiaomi MiMo, o1-style) emit a leading
   * <think>...</think> block. Three failure modes we handle:
   *   (a) closed block — strip <think>...</think> normally
   *   (b) unclosed block (response truncated mid-thought) — strip everything
   *       from <think> to end of string. Whatever follows is gibberish.
   *   (c) markdown ```json fences — drop them
   */
  cleanModelResponse(raw: string): string {
    let s = raw;
    // Closed reasoning blocks
    s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
    s = s.replace(/<\|begin_of_thought\|>[\s\S]*?<\|end_of_thought\|>/gi, '');
    // Unclosed reasoning block: response was truncated inside <think>
    if (/<think>/i.test(s)) {
      s = s.replace(/<think>[\s\S]*$/i, '');
    }
    if (/<\|begin_of_thought\|>/i.test(s)) {
      s = s.replace(/<\|begin_of_thought\|>[\s\S]*$/i, '');
    }
    // Markdown fences
    s = s.replace(/```(?:json)?\s*\n?|\n?```/g, '');
    return s.trim();
  }

  /** Pull a wait time from a 429 error: prefer Retry-After header, else
   *  exponential backoff capped at 8s. attempt is 1-indexed. */
  private compute429Backoff(err: unknown, attempt: number): number {
    const retryAfter = Number(
      ((err as { headers?: Record<string, string> })?.headers?.['retry-after']) ?? NaN,
    );
    if (!isNaN(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 30000);
    return Math.min(2000 * 2 ** (attempt - 1), 8000);
  }

  private isRateLimitError(err: unknown): boolean {
    const e = err as { status?: number; response?: { status?: number } };
    return e?.status === 429 || e?.response?.status === 429;
  }

  private async tracked<T extends { usage?: { prompt_tokens?: number; completion_tokens?: number } | null }>(
    kind: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    await this.acquire();
    const start = Date.now();
    this.callsByKind[kind] = (this.callsByKind[kind] || 0) + 1;
    try {
      let attempt = 0;
      while (true) {
        try {
          const result = await fn();
          this.stats.calls++;
          this.stats.latencyMs += Date.now() - start;
          this.stats.promptTokens += result.usage?.prompt_tokens || 0;
          this.stats.completionTokens += result.usage?.completion_tokens || 0;
          return result;
        } catch (err) {
          // Retry on 429 with backoff. Hold the semaphore slot during the
          // wait — that's the whole point: it naturally throttles the next
          // wave of requests too.
          if (this.isRateLimitError(err) && attempt < this.maxRetries429) {
            attempt++;
            this.stats.retries++;
            const wait = this.compute429Backoff(err, attempt);
            console.warn(
              `[AI ${kind}] 429 rate-limited, retry ${attempt}/${this.maxRetries429} after ${wait}ms`,
            );
            await this.sleep(wait);
            continue;
          }
          // Final failure
          this.stats.calls++;
          this.stats.errors++;
          this.stats.latencyMs += Date.now() - start;
          if (this.stats.errors <= 3) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[AI ${kind}] error #${this.stats.errors}:`, msg);
          }
          throw err;
        }
      }
    } finally {
      this.release();
    }
  }

  async expandKeyword(keyword: string): Promise<string[]> {
    if (this.expansionCache.has(keyword)) {
      return this.expansionCache.get(keyword)!;
    }

    const coreTerms = this.extractCoreTerms(keyword);

    if (!process.env.OPENAI_API_KEY) {
      const result = [keyword, ...coreTerms];
      this.expansionCache.set(keyword, result);
      return result;
    }

    try {
      const result = await this.tracked('expandKeyword', () => this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `你是一个搜索查询扩展专家。给定一个监控关键词，生成该关键词的变体和相关检索词，用于文本匹配。

规则：
1. 包含原始关键词的各种写法（大小写、空格、连字符变体）
2. 包含关键词的核心组成词（拆分后的各个有意义的词）
3. 包含常见别称、缩写、中英文对照
4. 不要加入泛化词（比如关键词是"Claude Sonnet 4.6"，不要加"AI模型"这种泛化词）
5. 总数控制在 5-15 个

输出 JSON 数组，只输出 JSON，不要有其他内容。
示例输入："Claude Sonnet 4.6"
示例输出：["Claude Sonnet 4.6", "Claude Sonnet", "Sonnet 4.6", "claude-sonnet-4.6", "Claude 4.6", "Anthropic Sonnet"]`,
          },
          { role: 'user', content: keyword },
        ],
        temperature: 0.2,
        max_tokens: 300,
      }));

      const rawContent = result.choices[0]?.message?.content || '';
      const responseContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed: string[] = JSON.parse(jsonMatch[0]);
        const expanded = [...new Set([keyword, ...coreTerms, ...parsed.map(s => s.trim()).filter(Boolean)])];
        this.expansionCache.set(keyword, expanded);
        console.log(`  🔍 Query expansion for "${keyword}": ${expanded.length} variants`);
        return expanded;
      }
    } catch (error) {
      console.error('Query expansion failed:', error);
    }

    const fallback = [keyword, ...coreTerms];
    this.expansionCache.set(keyword, fallback);
    return fallback;
  }

  private extractCoreTerms(keyword: string): string[] {
    const terms: string[] = [];
    const parts = keyword.split(/[\s\-_\/\\·]+/).filter(p => p.length >= 2);
    if (parts.length > 1) {
      terms.push(...parts);
      for (let i = 0; i < parts.length - 1; i++) {
        terms.push(parts[i] + ' ' + parts[i + 1]);
      }
    }
    return [...new Set(terms)].filter(t => t.toLowerCase() !== keyword.toLowerCase());
  }

  preMatchKeyword(text: string, expandedKeywords: string[]): { matched: boolean; matchedTerms: string[] } {
    const lowerText = text.toLowerCase();
    const matchedTerms: string[] = [];
    for (const kw of expandedKeywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        matchedTerms.push(kw);
      }
    }
    return { matched: matchedTerms.length > 0, matchedTerms };
  }

  /**
   * Normalize a model-produced event slug: lowercase, collapse any non
   * [a-z0-9-] run to a single hyphen, trim hyphens, length-cap. Returns
   * undefined when the result is too short to be a usable fingerprint, so
   * downstream falls back to the token-md5 cluster key.
   */
  private normalizeEventKey(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const slug = raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return slug.length >= 3 ? slug : undefined;
  }

  private buildAnalysisPrompt(keyword: string, preMatchResult: { matched: boolean; matchedTerms: string[] }): string {    const matchHint = preMatchResult.matched
      ? `\n注意：文本预匹配发现内容中包含以下关键词变体：${preMatchResult.matchedTerms.join('、')}`
      : `\n注意：文本预匹配发现内容中未直接提及关键词"${keyword}"的任何变体，请特别严格审核相关性。`;

    // Two-stage judgment (inspired by retrieval grader pattern):
    //   1) Force a hard yes/no decision first — kills "中庸 50 分" answers.
    //   2) Only emit a non-zero relevance and full metadata when isRelevant=yes.
    //
    // The numeric `relevance` is preserved for backward compatibility with the
    // existing downstream filter (`relevance >= 50`), but it's now derived from
    // a discrete band, not free-form 0-100.
    return `你是一个热点内容精准匹配专家。判断一段内容是否与监控关键词【${keyword}】直接相关。

${matchHint}

【判断规则】（先做二元决策，再分级）
1. isRelevant 只能是 "yes" 或 "no"
   - "yes" 当且仅当：内容【直接】讨论、提及或与"${keyword}"有实质关联
   - "no" 当：仅同领域但未提及；同类产品；只是顺带带过；标题党
   - 不允许"也许"、"部分相关"——必须做出明确选择
2. 如果 isRelevant = "no"：relevance 必须在 0-30 之间
3. 如果 isRelevant = "yes"：
   - 直接讨论关键词且有信息量 → relevance 80-95
   - 提及但深度有限 → relevance 65-79
   - 间接相关但确有联系 → relevance 50-64

【其他字段】
- isReal: 真实有价值（true）/ 标题党假新闻营销软文（false）
- keywordMentioned: 内容是否直接提及关键词或等价表述
- importance: low / medium / high / urgent（只在 isRelevant=yes 时才有意义）
- relevanceReason: 一句话说明为什么这样打分
- summary: 此内容与"${keyword}"的关联，一句话
- eventKey: 该新闻所报道【事件本身】的规范化英文 slug，用于把同一事件的不同报道归为一组。规则：
  - 全小写，单词用连字符连接，只含核心实体+核心动作（如公司名、产品名、关键动词）
  - 忽略国家/数量/措辞差异、忽略语言：同一事件无论标题怎么改写、中文还是英文，都必须输出【完全相同】的 slug
  - 例：标题 "Anthropic scales Claude Mythos to critical infrastructure in 15 countries/nations/regions" 与中文"Anthropic将Claude Mythos安全程序扩展至15国关键基础设施"都应输出 "anthropic-claude-mythos-critical-infrastructure"

请以 JSON 格式输出，只输出 JSON：
{
  "isRelevant": "yes" or "no",
  "isReal": true/false,
  "relevance": 0-100,
  "relevanceReason": "...",
  "keywordMentioned": true/false,
  "importance": "low/medium/high/urgent",
  "summary": "...",
  "eventKey": "..."
}`;
  }

  async analyzeContent(
    content: string,
    keyword: string,
    preMatchResult?: { matched: boolean; matchedTerms: string[] },
  ): Promise<AIAnalysis> {
    const matchResult = preMatchResult ?? { matched: false, matchedTerms: [] };

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured, using fallback analysis');
      return {
        isReal: true,
        relevance: matchResult.matched ? 50 : 20,
        relevanceReason: '未配置 AI 服务，使用默认分数',
        keywordMentioned: matchResult.matched,
        importance: 'low',
        summary: content.slice(0, 50) + '...',
      };
    }

    try {
      const prompt = this.buildAnalysisPrompt(keyword, matchResult);

      const result = await this.tracked('analyzeContent', () => this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: content.slice(0, 2000) },
        ],
        temperature: 0.2,
        max_tokens: this.maxTokens,
      }));

      const msg = result.choices?.[0]?.message;
      // MiMo/reasoning models: prefer content; fallback to reasoning_content if content is null
      const rawContent = msg?.content || (msg as any)?.reasoning_content || '';
      const responseContent = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
      const cleaned = this.cleanModelResponse(responseContent);

      // Detect a likely-truncated reasoning response so we can log a
      // useful hint instead of "Failed to parse" with no context.
      const wasTruncated = /<think>/i.test(responseContent) && !/<\/think>/i.test(responseContent);

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // New schema enforces a binary isRelevant gate. If model says "no", clamp
        // numeric relevance to ≤30 regardless of what the model wrote, so
        // downstream filters (`relevance >= 50`) will correctly drop it.
        const isRelevant = String(parsed.isRelevant ?? '').toLowerCase() === 'yes';
        let relevance = Math.min(100, Math.max(0, Number(parsed.relevance) || 0));
        if (!isRelevant && relevance > 30) relevance = 30;
        return {
          isReal: Boolean(parsed.isReal),
          relevance,
          relevanceReason: String(parsed.relevanceReason || '').slice(0, 200),
          keywordMentioned: Boolean(parsed.keywordMentioned),
          importance: ['low', 'medium', 'high', 'urgent'].includes(parsed.importance)
            ? parsed.importance
            : 'low',
          summary: String(parsed.summary || '').slice(0, 150),
          eventKey: this.normalizeEventKey(parsed.eventKey),
        };
      }

      throw new Error(wasTruncated ? 'reasoning truncated' : 'Failed to parse AI response');
    } catch (error) {
      // Log distinct hints for the two main failure modes so the user knows
      // what to do.
      if (error instanceof Error && this.stats.errors < 3) {
        if (error.message === 'reasoning truncated') {
          console.error(
            '[AI analyzeContent] reasoning model output was cut off inside <think>. ' +
            `Bump AI_MAX_TOKENS in .env (current: ${this.maxTokens}) to e.g. 2500, ` +
            'or switch MODEL_NAME to a non-reasoning model (qwen-plus, deepseek-chat, etc.)',
          );
        } else if (error.message === 'Failed to parse AI response') {
          console.error('[AI analyzeContent] response did not contain parseable JSON');
        }
      }
      console.error('AI analysis failed:', error);
      return {
        isReal: true,
        relevance: matchResult.matched ? 30 : 10,
        relevanceReason: 'AI 分析失败，使用默认分数',
        keywordMentioned: matchResult.matched,
        importance: 'low',
        summary: content.slice(0, 50) + '...',
      };
    }
  }

  /** Low-level method: call the AI with raw message array, returns raw string response */
  async callRaw(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens = 400,
    kind = 'callRaw',
    timeoutMs?: number,
  ): Promise<string> {
    const response = await this.tracked(kind, () => this.client.chat.completions.create(
      {
        model: this.model,
        messages,
        temperature: 0.1,
        max_tokens: maxTokens,
      },
      timeoutMs ? { timeout: timeoutMs } : undefined,
    ));
    const msg = response.choices?.[0]?.message;
    // MiMo/reasoning models: prefer content; fallback to reasoning_content if content is null
    return msg?.content || (msg as any)?.reasoning_content || '';
  }

  /**
   * Hallucination grader: given a summary that was generated for an urgent-level
   * news item, verify it's actually grounded in the original content rather than
   * fabricated details. Inspired by BiliAgent's hallucination_grader pattern.
   *
   * Returns true if the summary is grounded (safe to keep), false otherwise
   * (caller should fall back to a slice of the original content).
   *
   * Only call this for urgent items — for medium/low items the cost outweighs
   * the benefit since they're less likely to mislead users anyway.
   */
  async checkSummaryGrounded(originalContent: string, summary: string): Promise<boolean> {
    if (!process.env.OPENAI_API_KEY) return true; // Can't check, trust it
    if (!summary || summary.length < 5) return true; // Empty summary won't mislead

    try {
      const response = await this.callRaw(
        [
          {
            role: 'system',
            content: `你是一个事实核查员。判断给定的"摘要"是否完全基于"原文"内容，不包含原文未提及的事实/数字/名称。
只输出 JSON: {"grounded": "yes" or "no"}
- grounded=yes：摘要中所有具体信息（数字、产品名、版本号、价格、人名）都能在原文中找到依据
- grounded=no：摘要捏造了原文未提及的具体信息`,
          },
          {
            role: 'user',
            content: `原文:\n${originalContent.slice(0, 800)}\n\n摘要:\n${summary}`,
          },
        ],
        80,
        'checkSummaryGrounded',
      );
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return true; // Parse failure → don't reject
      const json = JSON.parse(m[0]);
      return String(json.grounded ?? '').toLowerCase() === 'yes';
    } catch {
      return true; // On any error, don't reject — better to keep a slightly noisy summary than drop a real urgent item
    }
  }

  async batchAnalyze(contents: string[], keyword: string, expandedKeywords?: string[]): Promise<AIAnalysis[]> {
    const batchSize = 3;
    const results: AIAnalysis[] = [];

    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(content => {
          const preMatch = expandedKeywords ? this.preMatchKeyword(content, expandedKeywords) : undefined;
          return this.analyzeContent(content, keyword, preMatch);
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }
}
