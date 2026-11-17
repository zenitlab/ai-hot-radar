import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';

import { CATEGORY_LABEL } from '@/lib/categories';
import { fetchTopicSSR, type TopicItem, type TopicResponse } from '@/lib/server-api';
import { ogImages, twitterImages } from '@/lib/og-meta';
import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { generateBreadcrumbSchema, safeJsonLd } from '@/lib/structured-data';
import { displayTitle } from '@/lib/utils';

/**
 * One topic: its curated items of the last 30 days, newest first and grouped
 * by day, with the most-covered events of the last two weeks on top. Modeled
 * on aihot.news/topics/<slug>. Page 2+ is noindex: the first page carries the
 * topic, deeper pages are for readers.
 */
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{2,40}$/;
/** Below this many items a topic page is too thin to index. */
const MIN_INDEXABLE = 3;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

async function load(props: Props): Promise<TopicResponse | null> {
  const [{ slug }, { page }] = await Promise.all([props.params, props.searchParams]);
  if (!SLUG_RE.test(slug)) return null;
  return fetchTopicSSR(slug, Math.max(1, parseInt(page ?? '1', 10) || 1));
}

const titleOf = (d: TopicResponse) => `${d.topic.name} 最新动态与精选`;

export async function generateMetadata(props: Props): Promise<Metadata> {
  const d = await load(props);
  if (!d) return { title: '主题不存在', robots: { index: false, follow: true } };
  const title = titleOf(d);
  const description = `${d.topic.description}近 ${d.windowDays} 天 ${d.count} 条精选。`.slice(0, 160);
  const firstPage = d.pagination.page === 1;
  return {
    title,
    description,
    alternates: { canonical: firstPage ? `/topics/${d.topic.slug}` : `/topics/${d.topic.slug}?page=${d.pagination.page}` },
    robots: firstPage && d.count >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
    openGraph: { ...ogImages, title, description },
    twitter: { ...twitterImages, title, description },
  };
}

const itemTime = (i: TopicItem) => i.publishedAt || i.createdAt;

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });

function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string').slice(0, 3) : [];
  } catch {
    return [];
  }
}

function Item({ item }: { item: TopicItem }) {
  const tags = parseTags(item.tags);
  const time = itemTime(item);
  return (
    <li className="py-4">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
        <time dateTime={time}>{fmtTime(time)}</time>
        <span className="inline-flex items-center gap-1">
          {getSourceIcon(item.source, 'w-3 h-3')}
          {getSourceLabel(item.source)}
        </span>
        {item.qualityScore != null && (
          <span className="font-mono text-[var(--accent-blue)]">AI 评分 {Math.round(item.qualityScore)}</span>
        )}
      </div>
      <h3 className="text-[16px] font-semibold leading-snug">
        <Link href={`/items/${item.id}`} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
          {displayTitle(item)}
        </Link>
      </h3>
      {item.summary && <p className="mt-1.5 text-[14px] leading-[1.7] text-[var(--text-secondary)]">{item.summary}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {item.category && CATEGORY_LABEL[item.category] && (
          <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[var(--text-secondary)]">{CATEGORY_LABEL[item.category]}</span>
        )}
        {tags.map((t) => (
          <span key={t} className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[var(--text-secondary)]">{t}</span>
        ))}
        {item.otherSourceCount > 0 && item.clusterKey && (
          <Link href={`/story/${item.clusterKey}`} className="text-[var(--text-muted)] hover:text-[var(--accent-blue)]">
            另有 {item.otherSourceCount} 家来源报道：{item.otherSources.map(getSourceLabel).join('、')}
            {item.otherSourceCount > item.otherSources.length && ' 等'}
          </Link>
        )}
      </div>
      {item.recommendReason && (
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">推荐理由：</span>
          {item.recommendReason}
        </p>
      )}
    </li>
  );
}

export default async function TopicPage(props: Props) {
  const d = await load(props);
  if (!d) notFound();
  const { topic, pagination } = d;

  // Group the page's items by Beijing calendar day, newest first (the API already sorts).
  const byDay: Array<{ day: string; items: TopicItem[] }> = [];
  for (const item of d.items) {
    const day = fmtDay(itemTime(item));
    const last = byDay[byDay.length - 1];
    if (last?.day === day) last.items.push(item);
    else byDay.push({ day, items: [item] });
  }

  const path = `/topics/${topic.slug}`;
  const pageHref = (p: number) => (p === 1 ? path : `${path}?page=${p}`);
  const first = (pagination.page - 1) * pagination.pageSize + 1;
  const last = first + d.items.length - 1;

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}${path}`,
      url: `${SITE_URL}${path}`,
      name: titleOf(d),
      description: topic.description,
      inLanguage: 'zh-CN',
      isPartOf: { '@type': 'WebSite', name: 'AI Hot Radar', url: SITE_URL },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: d.items.length,
        itemListElement: d.items.map((i, n) => ({
          '@type': 'ListItem',
          position: first + n,
          url: `${SITE_URL}/items/${i.id}`,
          name: displayTitle(i),
        })),
      },
    },
    generateBreadcrumbSchema([
      { name: 'AI 主题', path: '/topics' },
      { name: topic.name, path },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="px-4 py-6 max-w-3xl mx-auto">
        <nav aria-label="位置" className="mb-4 text-xs text-[var(--text-muted)]">
          <Link href="/topics" className="inline-flex items-center gap-0.5 hover:text-[var(--text-primary)]">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            全部主题
          </Link>
        </nav>

        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)]">{topic.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{topic.description}</p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            近 {d.windowDays} 天 <span className="font-semibold text-[var(--text-secondary)]">{d.count}</span> 条精选
          </p>
        </header>

        {d.focus.length > 0 && pagination.page === 1 && (
          <section aria-labelledby="focus" className="mb-8 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
            <h2 id="focus" className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <Flame className="w-4 h-4 text-red-500" aria-hidden="true" />
              近期焦点
            </h2>
            <p className="mb-3 text-xs text-[var(--text-muted)]">近 14 天 · 按报道来源数</p>
            <ol className="space-y-2">
              {d.focus.map((f, i) => (
                <li key={f.id} className="flex items-start gap-2.5 text-sm">
                  <span className="w-4 shrink-0 font-mono font-bold text-[var(--text-muted)]">{i + 1}</span>
                  <Link href={`/items/${f.id}`} className="flex-1 text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                    {f.title}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">{f.sourceCount} 家来源</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="latest">
          <h2 id="latest" className="text-sm font-semibold text-[var(--text-primary)]">
            最新精选
            <span className="ml-1.5 font-normal text-xs text-[var(--text-muted)]">
              {d.count > 0 ? `第 ${first}–${last} 条 · 共 ${d.count} 条` : '近期暂无'}
            </span>
          </h2>
          {byDay.map(({ day, items }) => (
            <div key={day} className="mt-4">
              <h3 className="border-b border-[var(--border-subtle)] pb-1.5 text-xs font-semibold text-[var(--text-muted)]">
                {day} · {items.length} 条
              </h3>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {items.map((item) => <Item key={item.id} item={item} />)}
              </ul>
            </div>
          ))}
        </section>

        {pagination.totalPages > 1 && (
          <nav aria-label="分页" className="mt-6 flex items-center justify-between text-sm">
            {pagination.page > 1 ? (
              <Link href={pageHref(pagination.page - 1)} className="inline-flex items-center gap-0.5 text-[var(--accent-blue)] hover:underline">
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />上一页
              </Link>
            ) : <span />}
            <span className="text-xs text-[var(--text-muted)]">第 {pagination.page} / {pagination.totalPages} 页</span>
            {pagination.page < pagination.totalPages ? (
              <Link href={pageHref(pagination.page + 1)} className="inline-flex items-center gap-0.5 text-[var(--accent-blue)] hover:underline">
                下一页<ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : <span />}
          </nav>
        )}

        {d.related.length > 0 && (
          <section aria-labelledby="related" className="mt-8 border-t border-[var(--card-border)] pt-4">
            <h2 id="related" className="mb-2 text-sm font-semibold text-[var(--text-primary)]">相关主题</h2>
            <ul className="flex flex-wrap gap-2">
              {d.related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/topics/${r.slug}`}
                    className="inline-block rounded-full border border-[var(--card-border)] px-3 py-1 text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
                  >
                    {r.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
