import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { fetchTopicsSSR } from '@/lib/server-api';
import { ogImages, twitterImages } from '@/lib/og-meta';
import { generateBreadcrumbSchema, safeJsonLd } from '@/lib/structured-data';

/**
 * Topic index, modeled on aihot.news/topics: companies & models, technical
 * directions and content types, each with its 30-day count and latest item.
 * Topics are defined in server/src/topics/topics.config.ts.
 */
export const dynamic = 'force-dynamic';

const TITLE = 'AI 主题：公司、模型与技术方向的最新动态';
const DESCRIPTION = '按公司与模型、技术方向、内容类型浏览 AI 资讯：OpenAI、Anthropic、DeepSeek、Agent、AI 编程、推理部署等主题的最新精选与重要进展。';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/topics' },
  openGraph: { ...ogImages, title: TITLE, description: DESCRIPTION },
  twitter: { ...twitterImages, title: TITLE, description: DESCRIPTION },
};

export default async function TopicsPage() {
  const data = await fetchTopicsSSR();
  const groups = (data?.groups ?? []).map((g) => ({ ...g, topics: g.topics.filter((t) => t.count > 0) }));
  const total = groups.reduce((n, g) => n + g.topics.length, 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(generateBreadcrumbSchema([{ name: 'AI 主题', path: '/topics' }])) }}
      />
      <article className="px-4 py-6 max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">按主题看 AI</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            按公司与模型、技术方向、内容类型浏览 {total} 个主题，追踪近 {data?.windowDays ?? 30} 天的精选与重要进展。
          </p>
        </header>

        {total === 0 && (
          <p className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-sm text-[var(--text-secondary)]">
            暂时没有可显示的主题，稍后再来看看。
          </p>
        )}

        <div className="space-y-8">
          {groups.filter((g) => g.topics.length > 0).map((g) => (
            <section key={g.group} aria-labelledby={`g-${g.group}`}>
              <h2 id={`g-${g.group}`} className="text-base font-bold text-[var(--text-primary)]">{g.name}</h2>
              <p className="mb-3 text-xs text-[var(--text-muted)]">{g.description}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {g.topics.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/topics/${t.slug}`}
                      className="group flex h-full flex-col rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3.5 hover:border-[var(--card-border-hover)] transition-colors"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)]">{t.name}</span>
                        <span className="inline-flex shrink-0 items-center text-xs text-[var(--text-muted)]">
                          近 {data?.windowDays ?? 30} 天 {t.count} 条
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                      </span>
                      {t.latest && (
                        <span className="mt-1.5 text-[13px] leading-snug text-[var(--text-secondary)] line-clamp-2">{t.latest.title}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
    </>
  );
}
