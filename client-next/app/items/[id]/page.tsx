import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink, Layers, CalendarDays, Sparkles } from 'lucide-react';

import { fetchItemSSR, type ItemDetailResponse } from '@/lib/server-api';
import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { CATEGORY_LABEL } from '@/lib/categories';
import { generateBreadcrumbSchema, generateItemSchema, safeJsonLd } from '@/lib/structured-data';

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
  const description = (item.summary || item.title).slice(0, 160);
  const published = item.publishedAt || item.createdAt;
  return {
    title: item.title,
    description,
    alternates: { canonical: `/items/${id}` },
    robots: isIndexable(d) ? undefined : { index: false, follow: true },
    openGraph: { title: item.title, description, type: 'article', publishedTime: published },
    twitter: { title: item.title, description },
  };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) notFound();

  const { item, story, digestDate, related } = d;
  const published = item.publishedAt || item.createdAt;
  const sourceLabel = getSourceLabel(item.source);
  const section = item.category ? CATEGORY_LABEL[item.category] : undefined;

  const schemas = [
    generateItemSchema({
      path: `/items/${id}`,
      headline: item.title,
      description: item.summary || item.title,
      datePublished: published,
      dateModified: item.createdAt,
      sourceUrl: item.url,
      sourceName: sourceLabel,
      section,
    }),
    generateBreadcrumbSchema([
      { name: '精选', path: '/curated' },
      { name: item.title.slice(0, 40), path: `/items/${id}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }} />

      <article className="px-4 py-6 max-w-3xl mx-auto">
        <nav aria-label="位置" className="mb-4 text-xs text-[var(--text-muted)]">
          <Link href="/curated" className="inline-flex items-center gap-0.5 hover:text-[var(--text-primary)]">
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
            精选
          </Link>
          <span aria-hidden="true"> / </span>
          <span>内容详情</span>
        </nav>

        <header className="mb-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1 font-medium">
              {getSourceIcon(item.source, 'w-3.5 h-3.5')}
              {sourceLabel}
            </span>
            {section && (
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[var(--text-secondary)]">{section}</span>
            )}
            {item.isCurated && (
              <span className="rounded bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-[var(--accent-blue)]">精选</span>
            )}
            {item.qualityScore != null && (
              <span className="rounded-full border border-[var(--accent-blue)]/30 px-2 py-0.5 font-mono text-[var(--accent-blue)]" title="AI 评分">
                AI 评分 {Math.round(item.qualityScore)}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold leading-snug text-[var(--text-primary)] break-words">{item.title}</h1>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            发布于 <time dateTime={published}>{fmtDateTime(published)}</time>
            {item.authorName && <> · {item.authorName}</>}
          </p>
        </header>

        {/* Answer-first: summary and reason before anything else. */}
        <section aria-labelledby="ai-guide" className="mb-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 sm:p-5">
          <h2 id="ai-guide" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent-blue)]" aria-hidden="true" />
            AI 导读
          </h2>
          {item.summary ? (
            <p className="text-[15px] leading-[1.8] text-[var(--text-secondary)]">{item.summary}</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">这条内容暂无 AI 导读，可直接阅读原文。</p>
          )}
          {item.recommendReason && (
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">推荐理由：</span>
              {item.recommendReason}
            </p>
          )}
          <p className="mt-3 text-[11px] text-[var(--text-muted)]">导读由 AI 根据原文生成，以原文为准。</p>
        </section>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-blue)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 sm:w-auto sm:inline-flex"
        >
          阅读原文 · {sourceLabel}
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
        </a>

        {story && story.others.length > 0 && (
          <section aria-labelledby="event" className="mb-6">
            <h2 id="event" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
              <Layers className="w-4 h-4" aria-hidden="true" />
              同一事件的其他报道
              <span className="font-normal text-xs text-[var(--text-muted)]">共 {story.sourceCount} 家来源</span>
            </h2>
            <ul className="space-y-1.5">
              {story.others.slice(0, 5).map((o) => (
                <li key={o.id} className="text-sm">
                  <Link href={`/items/${o.id}`} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                    <span className="text-[var(--text-muted)]">{getSourceLabel(o.source)}：</span>
                    {o.title}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`/story/${story.clusterKey}`} className="mt-2 inline-block text-xs text-[var(--accent-blue)] hover:underline">
              查看事件全部报道与时间线 →
            </Link>
          </section>
        )}

        {digestDate && (
          <p className="mb-6 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
            收录于
            <Link href={`/digest/${digestDate}`} className="text-[var(--accent-blue)] hover:underline">
              {digestDate} AI 日报
            </Link>
          </p>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related" className="border-t border-[var(--card-border)] pt-4">
            <h2 id="related" className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
              相关精选{section ? ` · ${section}` : ''}
            </h2>
            <ul className="space-y-1.5">
              {related.map((r) => (
                <li key={r.id} className="text-sm">
                  <Link href={`/items/${r.id}`} className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] break-words">
                    {r.title}
                  </Link>
                  <span className="ml-1.5 text-xs text-[var(--text-muted)]">{getSourceLabel(r.source)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-8 border-t border-[var(--card-border)] pt-4 text-xs text-[var(--text-muted)]">
          标题与原文版权归原作者，本页仅提供摘要与导读，完整内容请阅读原文。
        </footer>
      </article>
    </>
  );
}
