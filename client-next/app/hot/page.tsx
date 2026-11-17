import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, TrendingDown, TrendingUp, Minus } from 'lucide-react';

import { fetchTrendingBoardSSR } from '@/lib/server-api';
import { ogImages, twitterImages } from '@/lib/og-meta';
import { getSourceLabel } from '@/lib/sourceMeta';
import { generateBreadcrumbSchema, safeJsonLd } from '@/lib/structured-data';
import { displayTitle } from '@/lib/utils';
import type { TrendingEvent } from '@/services/api';

/**
 * 热点榜: the events most sources are discussing in the last 48 hours, ranked
 * by cross-source heat (server/src/utils/event-heat.ts). Modeled on
 * aihot.news/hot. Server-rendered with no client JS so the ranking is in the
 * first HTML for crawlers; per request because the backend isn't reachable at
 * build time (see lib/server-api.ts).
 */
export const dynamic = 'force-dynamic';

const TITLE = 'AI 热点榜：今日 AI 圈热门事件排行';
const DESCRIPTION = '过去 48 小时 AI 圈讨论最多的事件排行：按多少家来源在报道、讨论有多新计算热度，附事件概览与涨跌走势，每 30 分钟更新。';
const TOP = 3;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/hot' },
  openGraph: { ...ogImages, title: TITLE, description: DESCRIPTION },
  twitter: { ...twitterImages, title: TITLE, description: DESCRIPTION },
};

/** Heat on a 0–100-ish scale: each participant counts up to 10, halving every 24 hours. */
const heatIndex = (e: TrendingEvent) => Math.round(e.heat * 10);
const eventTitle = (e: TrendingEvent) => e.overview?.title || displayTitle(e);
const eventHref = (e: TrendingEvent) => (e.clusterKey ? `/story/${e.clusterKey}` : `/items/${e.id}`);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });

/** "爆" / "新" / "发酵中": what the discussion is doing right now. */
function Badge({ e }: { e: TrendingEvent }) {
  const [label, cls] = e.surge
    ? ['爆', 'bg-red-500/10 text-red-600 dark:text-red-400']
    : e.trend === 'new'
      ? ['新', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400']
      : e.trend === 'rising'
        ? ['发酵中', 'bg-amber-500/10 text-amber-700 dark:text-amber-400']
        : [null, ''];
  if (!label) return null;
  return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

/** Change against six hours ago; new events have nothing to compare with. */
function Change({ e }: { e: TrendingEvent }) {
  const pct = e.changePct;
  if (pct === null || pct === undefined) return <span className="text-[var(--text-muted)]">首次上榜</span>;
  if (Math.abs(pct) < 5) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[var(--text-muted)]">
        <Minus className="w-3 h-3" aria-hidden="true" />持平
      </span>
    );
  }
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 ${up ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span className="sr-only">{up ? '上升' : '下降'}</span>
      {Math.abs(pct)}%
    </span>
  );
}

function Coverage({ e }: { e: TrendingEvent }) {
  const outlets = e.outletCount ?? e.sourceCount;
  return (
    <span>
      {outlets} 个来源
      {e.sourceCount > outlets && <> · {e.sourceCount} 位参与者</>}
    </span>
  );
}

export default async function HotPage() {
  const { events, updatedAt } = await fetchTrendingBoardSSR(10);
  const top = events.slice(0, TOP);
  const rest = events.slice(TOP);

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'AI 热点榜',
      description: DESCRIPTION,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: events.length,
      itemListElement: events.map((e, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: eventTitle(e),
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com'}${eventHref(e)}`,
      })),
    },
    generateBreadcrumbSchema([{ name: 'AI 热点榜', path: '/hot' }]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="px-4 py-6 max-w-3xl mx-auto">
        <header className="mb-6">
          <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            实时热度
          </p>
          <h1 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)]">AI 热点榜</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            过去 48 小时，AI 圈讨论最多的 {events.length || 10} 件事
            {updatedAt && (
              <>
                {' · '}
                <time dateTime={updatedAt}>{fmtTime(updatedAt)}</time> 更新
              </>
            )}
          </p>
        </header>

        {events.length === 0 ? (
          <p className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
            过去 48 小时还没有被两家以上来源同时报道的事件。可以先看{' '}
            <Link href="/curated" className="text-[var(--accent-blue)] hover:underline">今日精选</Link>。
          </p>
        ) : (
          <>
            <ol className="space-y-4">
              {top.map((e, i) => (
                <li key={e.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono font-bold text-[var(--text-muted)]">NO.{String(i + 1).padStart(2, '0')}</span>
                    <Change e={e} />
                  </div>
                  <h2 className="flex items-start gap-2 text-[17px] sm:text-lg font-bold leading-snug">
                    <Link href={eventHref(e)} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                      {eventTitle(e)}
                    </Link>
                    <Badge e={e} />
                  </h2>
                  {(e.overview?.text || e.summary) && (
                    <p className="mt-2 text-[14px] leading-[1.75] text-[var(--text-secondary)] line-clamp-5 whitespace-pre-line">
                      {e.overview?.text || e.summary}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-2 text-xs text-[var(--text-muted)]">
                    <span>
                      <Coverage e={e} /> · {e.sources.slice(0, 3).map((s) => getSourceLabel(s.split(':')[0])).join('、')}
                      {e.sources.length > 3 && ' 等'}
                    </span>
                    <span className="text-right">
                      <span className="block text-2xl font-bold leading-none text-[var(--text-primary)]">{heatIndex(e)}</span>
                      热度指数
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            {rest.length > 0 && (
              <section aria-labelledby="rest" className="mt-8">
                <h2 id="rest" className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
                  继续看 No.{String(TOP + 1).padStart(2, '0')}–{String(events.length).padStart(2, '0')}
                </h2>
                <ol start={TOP + 1} className="divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]">
                  {rest.map((e, i) => (
                    <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 w-6 shrink-0 font-mono text-sm font-bold text-[var(--text-muted)]">
                        {String(TOP + i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="flex items-start gap-2 text-[15px] font-medium leading-snug">
                          <Link href={eventHref(e)} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                            {eventTitle(e)}
                          </Link>
                          <Badge e={e} />
                        </h3>
                        <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)]">
                          <Coverage e={e} />
                          <Change e={e} />
                        </p>
                      </div>
                      <span className="shrink-0 text-right text-xs text-[var(--text-muted)]">
                        <span className="block text-base font-bold text-[var(--text-primary)]">{heatIndex(e)}</span>
                        热度
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        <details className="mt-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">热度是怎么算的？</summary>
          <div className="mt-3 space-y-2">
            <p>
              热度看的是有多少家来源在讨论同一件事：同一家来源重复发只算一次；每家来源最多计 10 分，距离它最近一次报道每过
              24 小时减半。它反映讨论有多热闹，不代表报道质量。
            </p>
            <p>榜单只看过去 48 小时、至少两家独立来源报道过的事件。涨跌和 6 小时前的热度比较；没人继续报道的事件，热度会自然回落。</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-red-600 dark:text-red-400">爆</dt>
              <dd>6 小时内热度涨了一半以上</dd>
              <dt className="font-semibold text-emerald-700 dark:text-emerald-400">新</dt>
              <dd>首报在 6 小时内</dd>
              <dt className="font-semibold text-amber-700 dark:text-amber-400">发酵中</dt>
              <dd>讨论仍在增加</dd>
            </dl>
          </div>
        </details>
      </article>
    </>
  );
}
