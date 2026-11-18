import type { Metadata } from 'next';
import Link from 'next/link';

import { fetchTrendingBoardSSR } from '@/lib/server-api';
import { ogImages, twitterImages } from '@/lib/og-meta';
import { getSourceLabel } from '@/lib/sourceMeta';
import { generateBreadcrumbSchema, safeJsonLd } from '@/lib/structured-data';
import { displayTitle } from '@/lib/utils';
import { HEAT_LEGEND, heatColor, heatIndex } from '@/lib/heat';
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

const eventTitle = (e: TrendingEvent) => e.overview?.title || displayTitle(e);
const eventHref = (e: TrendingEvent) => (e.clusterKey ? `/story/${e.clusterKey}` : `/items/${e.id}`);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  });

/** "爆" / "新" / "发酵中": what the discussion is doing right now. */
function Badge({ e }: { e: TrendingEvent }) {
  const [label, color] = e.surge
    ? ['爆', 'var(--heat-5)']
    : e.trend === 'new'
      ? ['新', 'var(--heat-2)']
      : e.trend === 'rising'
        ? ['发酵中', 'var(--heat-4)']
        : [null, ''];
  if (!label) return null;
  return (
    <span className="ml-2 inline-block rounded border px-1.5 align-[2px] text-[11px] font-semibold leading-[18px]" style={{ color, borderColor: color }}>
      {label}
    </span>
  );
}

/** Change against six hours ago; new events have nothing to compare with. */
function Change({ e }: { e: TrendingEvent }) {
  const pct = e.changePct;
  if (pct === null || pct === undefined) return <span>首次上榜</span>;
  if (Math.abs(pct) < 5) return <span>和 6 小时前持平</span>;
  return pct > 0 ? (
    <span className="text-[var(--heat-5)]">6 小时 +{pct}%</span>
  ) : (
    <span>6 小时 {pct}%</span>
  );
}

function Coverage({ e }: { e: TrendingEvent }) {
  const outlets = e.outletCount ?? e.sourceCount;
  // Participants like "hackernews:alice" share one outlet name; list each outlet once.
  const labels = [...new Set(e.sources.map((s) => getSourceLabel(s.split(':')[0])))];
  return (
    <span>
      {outlets} 家来源{e.sourceCount > outlets && `，${e.sourceCount} 位参与者`}：{labels.slice(0, 3).join('、')}
      {labels.length > 3 && ' 等'}
    </span>
  );
}

export default async function HotPage() {
  const { events, updatedAt } = await fetchTrendingBoardSSR(10);

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

  const max = Math.max(...events.map((e) => e.heat), 0) || 1;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="mx-auto max-w-[860px] px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h1 className="text-2xl font-bold">AI 热点榜</h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              过去 48 小时，多家来源同时在报道的 {events.length || 10} 件事
              {updatedAt && (
                <>
                  ，<time dateTime={updatedAt}>{fmtTime(updatedAt)}</time> 更新
                </>
              )}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]" aria-hidden="true">
            热度低
            {HEAT_LEGEND.map((c) => (
              <i key={c} className="h-1.5 w-3.5 rounded-sm" style={{ background: c }} />
            ))}
            高
          </span>
        </header>

        {events.length === 0 ? (
          <p className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
            过去 48 小时还没有被两家以上来源同时报道的事件。可以先看{' '}
            <Link href="/curated" className="font-semibold text-[var(--accent-blue)] hover:underline">精选</Link>。
          </p>
        ) : (
          <ol className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)]">
            {events.map((e, i) => {
              const index = heatIndex(e.heat);
              const color = heatColor(index);
              const expanded = i < TOP;
              const text = e.overview?.text || e.summary;
              return (
                <li key={e.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-x-3 border-t border-[var(--border-subtle)] px-4 py-4 first:border-t-0 sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-6">
                  <span className="pt-0.5 text-lg font-bold tabular-nums text-[var(--text-muted)]" style={{ fontStretch: '80%' }}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    {expanded ? (
                      <h2 className="text-[17px] font-bold leading-snug sm:text-lg">
                        <Link href={eventHref(e)} className="hover:text-[var(--accent-blue)]">{eventTitle(e)}</Link>
                        <Badge e={e} />
                      </h2>
                    ) : (
                      <h3 className="text-[15px] font-semibold leading-snug sm:text-base">
                        <Link href={eventHref(e)} className="hover:text-[var(--accent-blue)]">{eventTitle(e)}</Link>
                        <Badge e={e} />
                      </h3>
                    )}
                    <span className="mt-2 block h-1.5 max-w-sm overflow-hidden rounded-full bg-[var(--bg-elevated)]" aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${Math.max(6, (e.heat / max) * 100)}%`, background: color }} />
                    </span>
                    {expanded && text && (
                      <p className="mt-2.5 whitespace-pre-line text-sm leading-[1.75] text-[var(--text-secondary)] line-clamp-5">{text}</p>
                    )}
                    <p className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[var(--text-muted)]">
                      <Coverage e={e} />
                      <Change e={e} />
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block text-2xl font-extrabold leading-none tabular-nums" style={{ color, fontStretch: '80%' }}>
                      {index}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">热度</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <details className="mt-8 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <summary className="cursor-pointer font-semibold text-[var(--text-primary)]">热度是怎么算的</summary>
          <div className="mt-3 space-y-2">
            <p>
              热度看的是有多少家来源在讨论同一件事：同一家来源重复发只算一次；每家来源最多计 10 分，距离它最近一次报道每过
              24 小时减半。它反映讨论有多热闹，不代表报道质量。
            </p>
            <p>
              榜单只看过去 48 小时、至少两家独立来源报道过的事件。涨跌和 6 小时前的热度比较；没人继续报道的事件，热度会自然回落。
              颜色按热度分五档：10 以下、10–19、20–39、40–69、70 以上。
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <dt className="font-semibold text-[var(--heat-5)]">爆</dt>
              <dd>6 小时内热度涨了一半以上</dd>
              <dt className="font-semibold text-[var(--heat-2)]">新</dt>
              <dd>首报在 6 小时内</dd>
              <dt className="font-semibold text-[var(--heat-4)]">发酵中</dt>
              <dd>讨论仍在增加</dd>
            </dl>
          </div>
        </details>
      </article>
    </>
  );
}
