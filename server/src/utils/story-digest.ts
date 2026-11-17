import { ANTI_HALLUCINATION_RULES, UNTRUSTED_NOTE, stripUnsupportedYears, unsupportedTerms } from './writing-rules';

/**
 * Event overview ("事件概览") for a multi-source story page: one short piece
 * that tells a first-time reader what happened, written from every report in
 * the cluster. The page already has a timeline, so the overview explains
 * rather than retells. Approach borrowed from AIHOT's story-digest prompt; the
 * 已确认 / 尚未确认 / 为什么重要 fact sheet from agihunt.info event pages.
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
- digest 是开头一段，只写一到两句、通常 50-120 字：直接说清这件事的核心变化和目前的结论，谁做了什么，结果如何。细节、数字和各方说法放进下面的 confirmed / unconfirmed，不要在 digest 里展开。
- 不要按日期逐条复述报道，页面上已有单独的时间线；日期只在影响理解时写。
- 用具体的主体、动作和结果表达；不照搬宣传语，不写与结论无关的履历和活动安排。
- 需要归于提出者的说法，在句中写明"某某称"。不同报道有影响结论的矛盾时，写明各自的说法和来源，不要悄悄抹平；宣传中的说法不能写成已经证实的效果。
- 收费、额度、地域、发布时间和限制，必须和对应的对象写在一起，不能把一种情况推广成全部。
- 只写事件本身：不评论有几篇报道、资料是否齐全、哪些信息没有披露，也不复述这些写作要求。
- title 不超过 30 字，概括整个事件，不能只复述最新一篇报道，必须点出主体。

另外把事实分成三组，每组是若干条短句，每条一件事、不超过 80 字，没有可写的就给空数组。三组都不要重复 digest 已经说过的话，写 digest 之外的细节：
- confirmed（已确认，最多 5 条）：当事方自己说的（公司公告、官方博客、当事机构发布的报告，哪怕只有一家来源转载），或两家以上来源说法一致的事实。只有转述来源时写明"据某某"。
- unconfirmed（尚未确认，最多 3 条）：只有单一非当事方来源的说法、传闻、爆料、未经当事方回应的指控或数字。每条必须写明是谁说的（"据某某称""某某爆料"），不要再补一句"目前无人证实"。"某信息没有公布"不是传闻，不要写进来。
- why（为什么重要，最多 3 条）：报道里提到的、或从报道事实直接推出的影响：对谁、改变了什么。不写空泛评价，不用"里程碑""颠覆""革命性"这类词，不预测报道里没有的后果。

${ANTI_HALLUCINATION_RULES}

只输出 JSON，不要有其他文字：{"title": "...", "digest": "...", "confirmed": ["..."], "unconfirmed": ["..."], "why": ["..."]}`,
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

/** The overview's fact sheet ("已确认 / 尚未确认 / 为什么重要"), borrowed from agihunt.info event pages. */
export interface StoryPoints {
  confirmed: string[];
  unconfirmed: string[];
  why: string[];
}

export interface StoryDigestText {
  title: string;
  digest: string;
  /** null when the model gave no usable points; the page then shows the lead alone. */
  points: StoryPoints | null;
}

const POINT_LIMITS: Record<keyof StoryPoints, number> = { confirmed: 5, unconfirmed: 3, why: 3 };
const POINT_MIN_CHARS = 8;
const POINT_MAX_CHARS = 120;
/** An unconfirmed point must say whose claim it is; otherwise it is a rumour the site is spreading in its own voice. */
const ATTRIBUTED = /据|称|传|爆料|曝|消息|转述|透露|指控|质疑|批评|声称|表示|认为|猜测|疑似|或将|可能/u;
/** Puffery the model reaches for when asked why something matters. */
const HYPE = /里程碑|颠覆|革命性|划时代|重磅|炸裂|彻底改变|改写(?:行业|历史)|新纪元/u;

function cleanPoints(raw: unknown, kind: keyof StoryPoints, sourceText: string): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    let text = entry.replace(/^\s*(?:[-*•·]|\d+[.、)])\s*/u, '').replace(/\s+/gu, ' ').trim();
    text = stripUnsupportedYears(text, sourceText);
    // "尚未公布定价" is a gap in the reporting, not an unconfirmed claim; drop it in every group.
    text = withoutMeta(text).trim();
    if (text.length < POINT_MIN_CHARS || text.length > POINT_MAX_CHARS) continue;
    if (unsupportedTerms(text, sourceText).length > 0) continue;
    if (kind === 'unconfirmed' && !ATTRIBUTED.test(text)) continue;
    if (kind === 'why' && HYPE.test(text)) continue;
    if (!out.includes(text)) out.push(text);
    if (out.length >= POINT_LIMITS[kind]) break;
  }
  return out;
}

/**
 * Validate what the model wrote against the reports it was given. Returns null
 * when the overview can't be trusted (unparseable, too short or long, or it
 * names something no report mentions); the page then simply shows no overview.
 * Points are checked one by one: a bad point is dropped, the rest stay.
 */
export function parseStoryDigest(raw: string, items: StoryReport[]): StoryDigestText | null {
  const match = raw.match(/\{[\s\S]*\}/u);
  if (!match) return null;
  let json: { title?: unknown; digest?: unknown; confirmed?: unknown; unconfirmed?: unknown; why?: unknown };
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

  const points: StoryPoints = {
    confirmed: cleanPoints(json.confirmed, 'confirmed', sourceText),
    unconfirmed: cleanPoints(json.unconfirmed, 'unconfirmed', sourceText),
    why: cleanPoints(json.why, 'why', sourceText),
  };
  // Without at least one confirmed fact the other two groups have nothing to stand on.
  return { title, digest, points: points.confirmed.length > 0 ? points : null };
}

/** Points stored as JSON in StoryDigest.points; null for rows written before points existed or unreadable JSON. */
export function readStoryPoints(stored: string | null | undefined): StoryPoints | null {
  if (!stored) return null;
  try {
    const p = JSON.parse(stored) as Partial<StoryPoints>;
    const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const out = { confirmed: list(p.confirmed), unconfirmed: list(p.unconfirmed), why: list(p.why) };
    return out.confirmed.length > 0 ? out : null;
  } catch {
    return null;
  }
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
