import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, CircleCheck, CircleHelp, ExternalLink, Lightbulb, ShieldCheck } from 'lucide-react';

import { fetchStorySSR, type StoryPoints, type StoryResponse } from '@/lib/server-api';
import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { generateBreadcrumbSchema, generateStorySchema, safeJsonLd } from '@/lib/structured-data';
import type { Hotspot } from '@/types';
import { displayTitle } from '@/lib/utils';

/**
 * Event page: every report on one story (one cluster), as a timeline.
 *
 * Server component with no client JS: the whole page is in the first HTML for
 * crawlers and AI engines, and it stays light on mobile. Rendered per request
 * because the backend isn't reachable at build time (see lib/server-api.ts).
 *
 * Indexing: single-source events are thin pages, so they're noindex,follow and
 * left out of the sitemap. Multi-source events carry original value (several
 * outlets side by side, a timeline) and are indexable.
 */
export const dynamic = 'force-dynamic';

const KEY_RE = /^[\w-]{3,64}$/;
const OFFICIAL_TIERS = new Set(['T1', 'T1.5']);

const reportTime = (h: Hotspot) => h.publishedAt || h.createdAt;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' });

/** Event headline: the overview's own title when it has one, else the main report's. */
const storyTitle = (story: StoryResponse) => story.digest?.title || displayTitle(story.main);

/** Overview paragraphs, or [] when none has been written for this event yet. */
const overviewParagraphs = (story: StoryResponse) =>
  story.digest?.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) ?? [];

/**
 * Answer-first description: the overview's opening paragraph (written to state
 * the outcome first), else the main item's summary, else a factual fallback.
 */
function describe(story: StoryResponse): string {
  const lead = overviewParagraphs(story)[0];
  if (lead) return lead;
  const s = story.main.summary?.trim();
  if (s) return s;
  return `${story.sourceCount} 家来源共 ${story.reportCount} 篇报道：${displayTitle(story.main)}`;
}

type Report = StoryResponse['items'][number];

/** The overview's fact sheet, in the order a reader needs it. Borrowed from agihunt.info event pages. */
const POINT_GROUPS: Array<{ key: keyof StoryPoints; label: string; Icon: typeof CircleCheck; iconClass: string }> = [
  { key: 'confirmed', label: '已确认', Icon: CircleCheck, iconClass: 'text-[var(--accent-emerald)]' },
  { key: 'unconfirmed', label: '尚未确认', Icon: CircleHelp, iconClass: 'text-[var(--accent-amber)]' },
  { key: 'why', label: '为什么重要', Icon: Lightbulb, iconClass: 'text-[var(--accent-blue)]' },
];

function PointList({ points }: { points: StoryPoints }) {
  return (
    <div className="mt-4 space-y-4">
      {POINT_GROUPS.filter((g) => points[g.key].length > 0).map(({ key, label, Icon, iconClass }) => (
        <div key={key}>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
            <Icon className={`w-4 h-4 ${iconClass}`} aria-hidden="true" />
            {label}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-[14px] leading-[1.75] text-[var(--text-secondary)] marker:text-[var(--text-muted)]">
            {points[key].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

async function load(key: string): Promise<StoryResponse | null> {
  if (!KEY_RE.test(key)) return null;
  return fetchStorySSR(key);
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const story = await load(key);
  if (!story) return { title: '事件不存在', robots: { index: false, follow: true } };

  const title = storyTitle(story);
  const description = `${describe(story)}（${story.sourceCount} 家来源 · ${story.reportCount} 篇报道）`.slice(0, 160);
  const indexable = story.sourceCount >= 2;
  return {
    title,
    description,
    alternates: { canonical: `/story/${key}` },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: story.firstReportedAt,
      modifiedTime: story.lastUpdatedAt,
    },
    twitter: { title, description },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const story = await load(key);
  if (!story) notFound();

  const { main, items } = story;
  const title = storyTitle(story);
  const description = describe(story);
  const overview = overviewParagraphs(story);
  const points = story.digest?.points ?? null;
  const official = items.filter((h) => OFFICIAL_TIERS.has(h.sourceTier ?? ''));
  const latest = items[items.length - 1];
  const firstId = items[0]?.id;

  // Near-copies of an earlier headline are folded under that report instead of
  // repeating it in the timeline (agihunt.info's "近重复转述").
  const copies = new Map<string, Report[]>();
  for (const h of items) {
    if (h.duplicateOf) copies.set(h.duplicateOf, [...(copies.get(h.duplicateOf) ?? []), h]);
  }
  const shown = items.filter((h) => !h.duplicateOf);
  const folded = items.length - shown.length;

  // Timeline grouped by day, newest day first; within a day, newest first.
  const byDay = new Map<string, Report[]>();
  for (const h of [...shown].reverse()) {
    const day = fmtDay(reportTime(h));
    byDay.set(day, [...(byDay.get(day) ?? []), h]);
  }

  const schemas = [
    ...generateStorySchema({
      path: `/story/${key}`,
      headline: title,
      description,
      datePublished: story.firstReportedAt,
      dateModified: story.lastUpdatedAt,
      reports: items.map((h) => ({
        title: displayTitle(h),
        url: h.url,
        source: getSourceLabel(h.source),
        publishedAt: reportTime(h),
      })),
    }),
    generateBreadcrumbSchema([
      { name: 'AI 热点榜', path: '/hot' },
      { name: title.slice(0, 40), path: `/story/${key}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="px-4 py-6 max-w-3xl mx-auto">
        <nav aria-label="位置" className="mb-4 text-xs text-[var(--text-muted)]">
          <Link href="/hot" className="inline-flex items-center gap-0.5 hover:text-[var(--text-primary)]">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            热点榜
          </Link>
          <span aria-hidden="true"> / </span>
          <span>事件详情</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)] break-words">
            {title}
          </h1>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
            <div className="flex gap-1">
              <dt>报道</dt>
              <dd className="font-semibold text-[var(--text-secondary)]">{story.reportCount} 篇</dd>
            </div>
            <div className="flex gap-1">
              <dt>来源</dt>
              <dd className="font-semibold text-[var(--text-secondary)]">{story.sourceCount} 家</dd>
            </div>
            <div className="flex gap-1">
              <dt>首报</dt>
              <dd>
                <time dateTime={story.firstReportedAt}>{fmtDateTime(story.firstReportedAt)}</time>
              </dd>
            </div>
            <div className="flex gap-1">
              <dt>最近更新</dt>
              <dd>
                <time dateTime={story.lastUpdatedAt}>{fmtDateTime(story.lastUpdatedAt)}</time>
              </dd>
            </div>
          </dl>
        </header>

        {/* Answer-first: what happened, in one block, before the timeline. */}
        <section aria-labelledby="overview" className="mb-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <h2 id="overview" className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
            {overview.length > 0 ? '事件概览' : '先了解这件事'}
          </h2>
          {overview.length > 0 ? (
            <div className="space-y-2.5">
              {overview.map((p) => (
                <p key={p} className="text-[15px] leading-[1.8] text-[var(--text-secondary)]">{p}</p>
              ))}
            </div>
          ) : (
            <p className="text-[15px] leading-[1.8] text-[var(--text-secondary)]">{description}</p>
          )}
          {points && <PointList points={points} />}
          {main.recommendReason && (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">推荐理由：</span>
              {main.recommendReason}
            </p>
          )}
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            {overview.length > 0
              ? `概览由 AI 综合 ${story.reportCount} 篇报道生成，以原文为准 · 主要来源 ${getSourceLabel(main.source)}`
              : `摘要由 AI 根据报道生成，摘自 ${getSourceLabel(main.source)}`}
            {' · '}
            <a href={main.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-primary)]">
              阅读原文
            </a>
          </p>
          {latest && latest.id !== main.id && (
            <p className="mt-3 border-t border-[var(--card-border)] pt-3 text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">最新进展：</span>
              <a href={latest.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-blue)]">
                {displayTitle(latest)}
              </a>
            </p>
          )}
        </section>

        {official.length > 0 && (
          <section aria-labelledby="official" className="mb-6">
            <h2 id="official" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-emerald)]" aria-hidden="true" />
              一手来源
              <span className="font-normal text-xs text-[var(--text-muted)]">{official.length} 篇 · 直接了解当事方的说法</span>
            </h2>
            <ul className="space-y-1.5">
              {official.map((h) => (
                <li key={h.id} className="text-sm">
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                    <span className="text-[var(--text-muted)]">{getSourceLabel(h.source)}：</span>
                    {displayTitle(h)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="timeline">
          <h2 id="timeline" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            报道时间线
            <span className="ml-1.5 font-normal text-xs text-[var(--text-muted)]">
              {shown.length} 篇{folded > 0 && `，另有 ${folded} 篇近似转述已折叠`}
            </span>
          </h2>
          {[...byDay.entries()].map(([day, list]) => (
            <div key={day} className="mb-4">
              <h3 className="mb-2 text-xs font-semibold text-[var(--text-muted)]">{day}</h3>
              <ol className="relative space-y-3 border-l border-[var(--card-border)] pl-4">
                {list.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-[var(--accent-blue)]" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                      <time dateTime={reportTime(h)}>{fmtDateTime(reportTime(h))}</time>
                      <span className="inline-flex items-center gap-1">
                        {getSourceIcon(h.source, 'w-3 h-3')}
                        {getSourceLabel(h.source)}
                      </span>
                      {h.id === firstId && (
                        <span className="rounded border border-[var(--border-default)] px-1.5 text-[var(--text-secondary)]">首报</span>
                      )}
                      {OFFICIAL_TIERS.has(h.sourceTier ?? '') && (
                        <span className="rounded border border-current px-1.5 text-[var(--accent-emerald)]">官方</span>
                      )}
                      {h.isCurated && (
                        <span className="rounded bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-[var(--accent-blue)]">精选</span>
                      )}
                    </div>
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-start gap-1 text-[15px] font-medium leading-snug text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words"
                    >
                      {displayTitle(h)}
                      <ExternalLink className="mt-1 w-3 h-3 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                    </a>
                    {h.summary && (
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{h.summary}</p>
                    )}
                    {copies.has(h.id) && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        另有 {copies.get(h.id)!.length} 篇近似转述：
                        {copies.get(h.id)!.map((c, i) => (
                          <span key={c.id}>
                            {i > 0 && ' · '}
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--text-primary)] hover:underline">
                              {getSourceLabel(c.source)}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <footer className="mt-8 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--text-muted)]">
          同一事件的报道集中在这里，新的进展会继续补充。标题与摘要版权归原作者，点击可阅读原文。
        </footer>
      </article>
    </>
  );
}
