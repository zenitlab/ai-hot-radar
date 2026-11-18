import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

import { fetchItemSSR, type ItemDetailResponse } from '@/lib/server-api';
import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { CATEGORY_LABEL } from '@/lib/categories';
import { generateBreadcrumbSchema, generateItemSchema, safeJsonLd } from '@/lib/structured-data';
import { displayTitle } from '@/lib/utils';
import { ItemTitle } from '@/components/common/ItemTitle';
import { sourceCountColor } from '@/lib/heat';
import { SourceTag } from '@/components/common/SourceTag';

/**
 * Item page: our summary and recommendation for one external article, its
 * event context, and the digest that included it — then a link to the source.
 *
 * Server component, no client JS. Rendered per request (backend isn't
 * reachable at build time, see lib/server-api.ts).
 *
 * Indexing: only curated items that have a summary are indexable. Anything
 * else is a thin page (title + link), so it's noindex,follow and kept out of
 * the sitemap. Canonical points to this page, not the source: we don't copy
 * the article, we add a summary and context.
 */
export const dynamic = 'force-dynamic';

const ID_RE = /^[0-9a-f-]{36}$/i;

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/** 2026-11-17 → 11月17日 */
const fmtDigestDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number);
  return `${m}月${day}日`;
};

function isIndexable(d: ItemDetailResponse): boolean {
  return Boolean(d.item.isCurated && d.item.summary?.trim());
}

async function load(id: string): Promise<ItemDetailResponse | null> {
  if (!ID_RE.test(id)) return null;
  return fetchItemSSR(id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: '内容不存在', robots: { index: false, follow: true } };

  const { item } = d;
  const title = displayTitle(item);
  const description = (item.summary || title).slice(0, 160);
  const published = item.publishedAt || item.createdAt;
  return {
    title,
    description,
    alternates: { canonical: `/items/${id}` },
    robots: isIndexable(d) ? undefined : { index: false, follow: true },
    openGraph: { title, description, type: 'article', publishedTime: published },
    twitter: { title, description },
  };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) notFound();

  const { item, story, digestDate, related } = d;
  const title = displayTitle(item);
  const published = item.publishedAt || item.createdAt;
  const sourceLabel = getSourceLabel(item.source);
  const section = item.category ? CATEGORY_LABEL[item.category] : undefined;

  const schemas = [
    generateItemSchema({
      path: `/items/${id}`,
      headline: title,
      description: item.summary || title,
      datePublished: published,
      dateModified: item.createdAt,
      sourceUrl: item.url,
      sourceName: sourceLabel,
      section,
    }),
    generateBreadcrumbSchema([
      { name: '精选', path: '/curated' },
      { name: title.slice(0, 40), path: `/items/${id}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:pt-8">
        <article className="min-w-0 max-w-[720px]">
          <nav aria-label="位置" className="mb-5 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
            <Link href="/curated" className="hover:text-[var(--text-primary)]">
              精选
            </Link>
            <span aria-hidden="true">/</span>
            <span>{section ?? '资讯'}</span>
          </nav>

          <header className="mb-6">
            <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                {getSourceIcon(item.source, 'w-3.5 h-3.5')}
                {sourceLabel}
              </span>
              <time dateTime={published}>{fmtDateTime(published)}</time>
              {item.authorName && <span>{item.authorName}</span>}
            </p>
            <h1 className="break-words text-[22px] font-bold leading-snug sm:text-[26px]">{title}</h1>
            {/* Original headline stays visible when ours is a translation, so readers can match it to the source. */}
            {title !== item.title && (
              <p className="mt-2 break-words text-sm leading-snug text-[var(--text-muted)]">原标题：{item.title}</p>
            )}
            <p className="mt-3 flex flex-wrap gap-x-3 text-[13px] text-[var(--text-muted)]">
              {item.isCurated && <span className="font-medium text-[var(--accent-blue)]">精选</span>}
              {item.qualityScore != null && <span className="tabular-nums">评分 {Math.round(item.qualityScore)}</span>}
              {story && story.sourceCount > 1 && (
                <Link href={`/story/${story.clusterKey}`} className="font-medium hover:underline" style={{ color: sourceCountColor(story.sourceCount) ?? undefined }}>
                  {story.sourceCount} 家来源报道
                </Link>
              )}
            </p>
          </header>

          {/* Answer-first: summary and reason before anything else. */}
          <section aria-labelledby="guide" className="mb-6 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-4 sm:px-6 sm:py-5">
            <h2 id="guide" className="mb-2 text-[15px] font-bold">导读</h2>
            {item.summary ? (
              <p className="text-[15px] leading-[1.85] text-[var(--text-primary)]">{item.summary}</p>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">这条还没有导读，信息以原文为准。</p>
            )}
            {item.recommendReason && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">值得看的原因：</span>
                {item.recommendReason}
              </p>
            )}
            <p className="mt-3 text-xs text-[var(--text-muted)]">导读由 AI 根据原文写成，可能有出入，以原文为准。</p>
          </section>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-blue)] px-5 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:opacity-90 sm:inline-flex sm:w-auto"
          >
            到 {sourceLabel} 阅读原文
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>

          <footer className="mt-10 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]">
            标题与原文版权归原作者，本页只提供摘要与导读，完整内容请阅读原文。
          </footer>
        </article>

        <aside className="min-w-0 space-y-8 lg:pt-10" aria-label="相关内容">
          {story && story.others.length > 0 && (
            <section aria-labelledby="event">
              <h2 id="event" className="mb-1 flex items-baseline justify-between gap-3 text-[15px] font-bold">
                同一事件的其他报道
                <span className="text-[13px] font-normal text-[var(--text-muted)]">共 {story.sourceCount} 家</span>
              </h2>
              <ul>
                {story.others.slice(0, 5).map((o) => (
                  <li key={o.id} className="border-b border-[var(--border-subtle)] py-2.5">
                    <Link href={`/items/${o.id}`} className="block break-words text-sm leading-snug hover:text-[var(--accent-blue)]">
                      <ItemTitle item={o} />
                    </Link>
                    <SourceTag source={o.source} iconClassName="h-3 w-3" className="mt-1 flex text-xs text-[var(--text-muted)]" />
                  </li>
                ))}
              </ul>
              <Link href={`/story/${story.clusterKey}`} className="mt-2 inline-block text-sm font-semibold text-[var(--accent-blue)] hover:underline">
                看事件全部报道和时间线
              </Link>
            </section>
          )}

          {digestDate && (
            <section aria-labelledby="in-digest">
              <h2 id="in-digest" className="mb-1 text-[15px] font-bold">收录于日报</h2>
              <Link href={`/digest/${digestDate}`} className="text-sm text-[var(--accent-blue)] hover:underline">
                {fmtDigestDate(digestDate)}日报
              </Link>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="related">
              <h2 id="related" className="mb-1 text-[15px] font-bold">
                {section ? `更多${section}精选` : '相关精选'}
              </h2>
              <ul>
                {related.map((r) => (
                  <li key={r.id} className="border-b border-[var(--border-subtle)] py-2.5">
                    <Link href={`/items/${r.id}`} className="block break-words text-sm leading-snug hover:text-[var(--accent-blue)]">
                      <ItemTitle item={r} />
                    </Link>
                    <SourceTag source={r.source} iconClassName="h-3 w-3" className="mt-1 flex text-xs text-[var(--text-muted)]" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
