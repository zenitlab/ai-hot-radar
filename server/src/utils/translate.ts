import {
  ANSWER_FIRST_SUMMARY_RULES,
  ANTI_HALLUCINATION_RULES,
  SELF_CONTAINED_TITLE_RULES,
  UNTRUSTED_NOTE,
  acceptTitleZh,
  cleanSummary,
  groundSummary,
  isChineseText,
  stripUnsupportedYears,
  unsupportedTerms,
} from './writing-rules';

/**
 * Backfill Chinese for items that reached the site in English: the scoring
 * call is meant to write a Chinese title and summary, but on some feeds the
 * title was rejected by acceptTitleZh or the summary came back in English.
 * One model call translates a batch. Pure helpers; the job is
 * hotspots/translate.job.ts.
 */

export interface TranslateItem {
  id: string;
  title: string;
  titleZh: string | null;
  summary: string | null;
  content: string;
  source: string;
  authorName?: string | null;
}

export interface TranslateNeed {
  title: boolean;
  summary: boolean;
}

/** What an item is missing in Chinese; both false means nothing to do. */
export function translationNeeds(h: Pick<TranslateItem, 'title' | 'titleZh' | 'summary'>): TranslateNeed {
  return {
    title: !h.titleZh && !isChineseText(h.title),
    summary: Boolean(h.summary?.trim()) && !isChineseText(h.summary),
  };
}

/** Items sent per call. Enough to be cheap, few enough that output stays well-formed. */
export const TRANSLATE_BATCH = 20;
const BODY_CHARS = 500;

export function buildTranslateMessages(items: TranslateItem[]): Array<{ role: 'system' | 'user'; content: string }> {
  const blocks = items.map((h, i) => {
    const need = translationNeeds(h);
    const body = (h.summary?.trim() || h.content).replace(/\s+/gu, ' ').slice(0, BODY_CHARS);
    return [
      `【${i + 1}】来源：${h.authorName || h.source}`,
      `原标题：${h.title}`,
      `正文：${body}`,
      `需要：${[need.title && 'titleZh', need.summary && 'summary'].filter(Boolean).join('、')}`,
    ].join('\n');
  });
  return [
    {
      role: 'system',
      content: `你是 AI 热点雷达的中文编辑，把英文资讯写成中文标题和中文摘要。
${UNTRUSTED_NOTE}

每条只写它「需要」里列出的字段：
- titleZh：忠实翻译原标题的意思，并按下面的标题规则点出主体。不添加原文没有的信息。
- summary：根据正文用中文写 1-2 句摘要，第一句说清谁做了什么。只写正文里有的事实。
- 产品名、模型名、公司名、人名保留原文写法（如 SageMaker、GPT-6.2 Astra、Snowflake），不要硬译。

${SELF_CONTAINED_TITLE_RULES}

${ANSWER_FIRST_SUMMARY_RULES}

${ANTI_HALLUCINATION_RULES}

只输出 JSON 数组，不要有其他文字：[{"i": 1, "titleZh": "...", "summary": "..."}]，不需要的字段省略。`,
    },
    { role: 'user', content: blocks.join('\n\n') },
  ];
}

export interface TranslationResult {
  titleZh?: string;
  summary?: string;
}

/**
 * Read the model's array and keep only what passes the writing-rule guards
 * against each item's own text. A field that fails is left out, so the site
 * keeps showing the original rather than a wrong translation.
 */
export function parseTranslations(raw: string, items: TranslateItem[]): Map<string, TranslationResult> {
  const out = new Map<string, TranslationResult>();
  const match = raw.match(/\[[\s\S]*\]/u);
  if (!match) return out;
  let rows: unknown;
  try {
    rows = JSON.parse(match[0]);
  } catch {
    return out;
  }
  if (!Array.isArray(rows)) return out;

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { i?: unknown; titleZh?: unknown; summary?: unknown };
    const item = typeof r.i === 'number' ? items[r.i - 1] : undefined;
    if (!item) continue;
    const need = translationNeeds(item);
    const sourceText = `${item.title}\n${item.authorName ?? ''}\n${item.summary ?? ''}\n${item.content}`;
    const result: TranslationResult = {};

    if (need.title) {
      const title = acceptTitleZh(r.titleZh, sourceText);
      if (title) result.titleZh = title;
    }
    if (need.summary && typeof r.summary === 'string') {
      let summary = stripUnsupportedYears(cleanSummary(r.summary), sourceText);
      summary = groundSummary(summary, sourceText, item.content.length);
      if (isChineseText(summary) && summary.length >= 10 && unsupportedTerms(summary, sourceText).length === 0) {
        result.summary = summary;
      }
    }
    if (result.titleZh || result.summary) out.set(item.id, result);
  }
  return out;
}
