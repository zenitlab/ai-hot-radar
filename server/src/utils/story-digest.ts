import { ANTI_HALLUCINATION_RULES, UNTRUSTED_NOTE, stripUnsupportedYears, unsupportedTerms } from './writing-rules';

/**
 * Event overview ("事件概览") for a multi-source story page: one short piece
 * that tells a first-time reader what happened, written from every report in
 * the cluster. The page already has a timeline, so the overview explains
 * rather than retells. Approach borrowed from AIHOT's story-digest prompt.
 *
 * Pure helpers only; the job that calls the model lives in story-digest.job.ts.
 */

export interface StoryReport {
  title: string;
  titleZh?: string | null;
  summary?: string | null;
  content: string;
  source: string;
  authorName?: string | null;
  sourceTier?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
}

/** Reports sent to the model. More adds tokens faster than it adds facts. */
const MAX_REPORTS = 8;
const BODY_CHARS = 320;
const OFFICIAL_TIERS = new Set(['T1', 'T1.5']);

const when = (r: StoryReport) => (r.publishedAt ?? r.createdAt).getTime();

/** First-party reports first (they carry the facts), then oldest first. */
export function pickReports(items: StoryReport[]): StoryReport[] {
  const official = (r: StoryReport) => (OFFICIAL_TIERS.has(r.sourceTier ?? '') ? 0 : 1);
  return [...items]
    .sort((a, b) => official(a) - official(b) || when(a) - when(b))
    .slice(0, MAX_REPORTS)
    .sort((a, b) => when(a) - when(b));
}

export function buildStoryDigestMessages(items: StoryReport[]): Array<{ role: 'system' | 'user'; content: string }> {
  const reports = pickReports(items).map((r, i) => {
    const body = (r.summary?.trim() || r.content).replace(/\s+/gu, ' ').slice(0, BODY_CHARS);
    const tag = OFFICIAL_TIERS.has(r.sourceTier ?? '') ? '（官方或一手来源）' : '';
    return `【报道 ${i + 1}】来源：${r.authorName || r.source}${tag}\n时间：${new Date(when(r)).toISOString().slice(0, 16).replace('T', ' ')} UTC\n标题：${r.title}\n内容：${body}`;
  });

  return [
    {
      role: 'system',
      content: `你是 AI 热点雷达的事件编辑，为第一次了解这件事的读者写"事件概览"。下面是同一事件的多篇报道。
${UNTRUSTED_NOTE}

要求：
- digest 第一句直接说清这件事的核心变化和目前的结论：谁做了什么，结果如何。之后按需要补上理解它所必需的背景、分歧或影响范围。
- 不要按日期逐条复述报道，页面上已有单独的时间线；日期只在影响理解时写。
- 通常 100-300 字，事实少时更短，不为凑字数添话。按意思分成 1-3 个短段，段与段之间用 \\n\\n 分隔，每段只讲一件事。
- 用具体的主体、动作和结果表达；不照搬宣传语，不写与结论无关的履历和活动安排。
- 需要归于提出者的说法，在句中写明"某某称"。不同报道有影响结论的矛盾时，写明各自的说法和来源，不要悄悄抹平；宣传中的说法不能写成已经证实的效果。
- 收费、额度、地域、发布时间和限制，必须和对应的对象写在一起，不能把一种情况推广成全部。
- 只写事件本身：不评论有几篇报道、资料是否齐全、哪些信息没有披露，也不复述这些写作要求。
- title 不超过 30 字，概括整个事件，不能只复述最新一篇报道，必须点出主体。

${ANTI_HALLUCINATION_RULES}

只输出 JSON，不要有其他文字：{"title": "...", "digest": "..."}`,
    },
    { role: 'user', content: reports.join('\n\n') },
  ];
}

/**
 * Sentences about the reporting rather than the event ("报道未披露定价",
 * "素材仅包含标题"). The prompt forbids them, live runs produced them anyway
 * whenever the reports were thin, and on a page they read as the site
 * apologising for itself.
 */
const META = /报道素材|素材仅|仅包含标题|(?:报道|资料|素材|官方)[^。！？]{0,6}仅|暂无[^。！？]{0,24}(?:信息|细节|消息|说明)|(?:暂|尚)?未(?:披露|公布|透露)|(?:报道|资料|素材|原文|文中|目前)[^。！？]{0,10}(?:未|没有|尚未)[^。！？]{0,6}(?:披露|提及|说明|公布|透露)|(?:尚|暂)?无法确认|资料(?:不足|有限)|信息(?:不足|有限)/u;

const withoutMeta = (paragraph: string) =>
  (paragraph.match(/[^。！？!?]+[。！？!?]?/gu) ?? [paragraph]).filter((sentence) => !META.test(sentence)).join('');

export interface StoryDigestText {
  title: string;
  digest: string;
}

/**
 * Validate what the model wrote against the reports it was given. Returns null
 * when the overview can't be trusted (unparseable, too short or long, or it
 * names something no report mentions); the page then simply shows no overview.
 */
export function parseStoryDigest(raw: string, items: StoryReport[]): StoryDigestText | null {
  const match = raw.match(/\{[\s\S]*\}/u);
  if (!match) return null;
  let json: { title?: unknown; digest?: unknown };
  try {
    json = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (typeof json.digest !== 'string') return null;

  const sourceText = items.map((r) => `${r.title}\n${r.titleZh ?? ''}\n${r.summary ?? ''}\n${r.authorName ?? ''}\n${r.content}`).join('\n');
  const digest = json.digest
    .split(/\n\s*\n|\\n\\n/u)
    .map((p) => withoutMeta(stripUnsupportedYears(p.replace(/\s*\n\s*/gu, '').trim(), sourceText)))
    .filter(Boolean)
    .slice(0, 3)
    .join('\n\n');
  if (digest.length < 40 || digest.length > 700) return null;
  if (unsupportedTerms(digest, sourceText).length > 0) return null;

  let title = typeof json.title === 'string' ? stripUnsupportedYears(json.title.replace(/\s+/gu, ' ').trim(), sourceText) : '';
  // A bad title doesn't sink a good overview; the page falls back to the main report's title.
  if (title.length < 4 || title.length > 45 || unsupportedTerms(title, sourceText).length > 0) title = '';
  return { title, digest };
}

export interface DigestState {
  clusterKey: string;
  sourceCount: number;
  updatedAt: Date;
}

/** Wait this long before rewriting an overview, however fast reports arrive. */
export const REWRITE_COOLDOWN_MS = 2 * 3600_000;

/**
 * Which stories need an overview written this run. New stories first, then
 * ones that gained an independent source since their overview was written (a
 * new source is what brings new facts; another post from the same source
 * rarely does). `stories` is expected newest first.
 */
export function storiesNeedingDigest(
  stories: Array<{ clusterKey: string; sourceCount: number }>,
  existing: DigestState[],
  limit: number,
  now = Date.now(),
): string[] {
  const byKey = new Map(existing.map((d) => [d.clusterKey, d]));
  const fresh: string[] = [];
  const grown: string[] = [];
  for (const s of stories) {
    const d = byKey.get(s.clusterKey);
    if (!d) fresh.push(s.clusterKey);
    else if (s.sourceCount > d.sourceCount && now - d.updatedAt.getTime() >= REWRITE_COOLDOWN_MS) grown.push(s.clusterKey);
  }
  return [...fresh, ...grown].slice(0, Math.max(0, limit));
}
