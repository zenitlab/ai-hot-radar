import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink, ShieldCheck } from 'lucide-react';

import { fetchStorySSR, type StoryResponse } from '@/lib/server-api';
import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { generateBreadcrumbSchema, generateStorySchema, safeJsonLd } from '@/lib/structured-data';
import type { Hotspot } from '@/types';

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

/** Answer-first description: the main item's summary, else a factual fallback. */
function describe(story: StoryResponse): string {
  const s = story.main.summary?.trim();
  if (s) return s;
  return `${story.sourceCount} 家来源共 ${story.reportCount} 篇报道：${story.main.title}`;
}

async function load(key: string): Promise<StoryResponse | null> {
  if (!KEY_RE.test(key)) return null;
  return fetchStorySSR(key);
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const story = await load(key);
  if (!story) return { title: '事件不存在', robots: { index: false, follow: true } };

  const title = story.main.title;
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
  const description = describe(story);
  const official = items.filter((h) => OFFICIAL_TIERS.has(h.sourceTier ?? ''));
  const latest = items[items.length - 1];

  // Timeline grouped by day, newest day first; within a day, newest first.
  const byDay = new Map<string, Hotspot[]>();
  for (const h of [...items].reverse()) {
    const day = fmtDay(reportTime(h));
    byDay.set(day, [...(byDay.get(day) ?? []), h]);
  }

  const schemas = [
    ...generateStorySchema({
      path: `/story/${key}`,
      headline: main.title,
      description,
      datePublished: story.firstReportedAt,
      dateModified: story.lastUpdatedAt,
      reports: items.map((h) => ({
        title: h.title,
        url: h.url,
        source: getSourceLabel(h.source),
        publishedAt: reportTime(h),
      })),
    }),
    generateBreadcrumbSchema([
      { name: '热点雷达', path: '/hotspot' },
      { name: main.title.slice(0, 40), path: `/story/${key}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="px-4 py-6 max-w-3xl mx-auto">
        <nav aria-label="位置" className="mb-4 text-xs text-[var(--text-muted)]">
          <Link href="/hotspot" className="inline-flex items-center gap-0.5 hover:text-[var(--text-primary)]">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            热点雷达
          </Link>
          <span aria-hidden="true"> / </span>
          <span>事件详情</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)] break-words">
            {main.title}
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
          <h2 id="overview" className="mb-2 text-sm font-semibold text-[var(--text-primary)]">先了解这件事</h2>
          <p className="text-[15px] leading-[1.8] text-[var(--text-secondary)]">{description}</p>
          {main.recommendReason && (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">推荐理由：</span>
              {main.recommendReason}
            </p>
          )}
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">
            摘要由 AI 根据报道生成，摘自 {getSourceLabel(main.source)} ·{' '}
            <a href={main.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[var(--text-primary)]">
              阅读原文
            </a>
          </p>
          {latest && latest.id !== main.id && (
            <p className="mt-3 border-t border-[var(--card-border)] pt-3 text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">最新进展：</span>
              <a href={latest.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-blue)]">
                {latest.title}
              </a>
            </p>
          )}
        </section>

        {official.length > 0 && (
          <section aria-labelledby="official" className="mb-6">
            <h2 id="official" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              官方一手
              <span className="font-normal text-xs text-[var(--text-muted)]">{official.length} 篇 · 直接了解当事方的说法</span>
            </h2>
            <ul className="space-y-1.5">
              {official.map((h) => (
                <li key={h.id} className="text-sm">
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                    <span className="text-[var(--text-muted)]">{getSourceLabel(h.source)}：</span>
                    {h.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="timeline">
          <h2 id="timeline" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
            报道时间线
            <span className="ml-1.5 font-normal text-xs text-[var(--text-muted)]">{story.reportCount} 篇</span>
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
                      {OFFICIAL_TIERS.has(h.sourceTier ?? '') && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">官方</span>
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
                      {h.title}
                      <ExternalLink className="mt-1 w-3 h-3 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                    </a>
                    {h.summary && (
                      <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">{h.summary}</p>
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
