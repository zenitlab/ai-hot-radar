'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { topicsApi } from '@/services/api';
import { toggleFollow, useFollows } from '@/lib/follows';
import type { TopicItem, TopicsResponse } from '@/lib/server-api';
import { ItemTitle } from '../common/ItemTitle';
import { SourceTag } from '../common/SourceTag';
import { SkeletonList } from '../common/Loader';
import { TopicIcon } from '../topics/TopicIcon';
import { FollowButton } from './FollowButton';

const FEED_LIMIT = 60;
const WEEK = '日一二三四五六';
const when = (i: TopicItem) => i.publishedAt || i.createdAt;
const bjDay = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);
const bjTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
function dayLabel(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return `${m}月${d}日 星期${WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
}

type FeedItem = TopicItem & { topics: string[] };

/**
 * The reader's own feed: newest items from the topics they follow, merged and
 * de-duplicated, grouped by Beijing day. One /api/topics/:slug request per
 * followed topic; nothing here calls a model.
 */
export function FollowedFeed() {
  const follows = useFollows();
  const [catalog, setCatalog] = useState<TopicsResponse | null>(null);
  const [feed, setFeed] = useState<{ key: string; items: FeedItem[] } | null>(null);
  const key = follows.join(',');

  useEffect(() => {
    topicsApi.getAll().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const slugs = key.split(',');
    Promise.all(slugs.map((s) => topicsApi.getOne(s).catch(() => null))).then((results) => {
      if (cancelled) return;
      const byId = new Map<string, FeedItem>();
      results.forEach((r) => {
        if (!r) return;
        for (const it of r.items) {
          const hit = byId.get(it.id);
          if (hit) hit.topics.push(r.topic.name);
          else byId.set(it.id, { ...it, topics: [r.topic.name] });
        }
      });
      const items = [...byId.values()].sort((a, b) => when(b).localeCompare(when(a))).slice(0, FEED_LIMIT);
      setFeed({ key, items });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const names = new Map(catalog?.groups.flatMap((g) => g.topics.map((t) => [t.slug, t.name] as const)) ?? []);
  const loading = follows.length > 0 && feed?.key !== key;

  if (follows.length === 0) {
    const companies = catalog?.groups.find((g) => g.group === 'company')?.topics.filter((t) => t.count > 0).slice(0, 12) ?? [];
    return (
      <div className="max-w-[760px]">
        <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
          关注几个公司或技术方向，这里会把它们的最新资讯合在一起，按时间排好。不用登录，关注记在这台设备的浏览器里。
        </p>
        {companies.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 text-[15px] font-bold">先关注几家公司</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {companies.map((t) => (
                <li key={t.slug} className="flex items-center gap-3 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5">
                  <TopicIcon slug={t.slug} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">近 {catalog?.windowDays ?? 30} 天 {t.count} 条</span>
                  </span>
                  <FollowButton slug={t.slug} name={t.name} />
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          技术方向和内容类型在
          <Link href="/topics" className="mx-1 font-semibold text-[var(--accent-blue)] hover:underline">主题页</Link>
          里关注。
        </p>
      </div>
    );
  }

  const groups: Array<{ day: string; items: FeedItem[] }> = [];
  for (const it of feed?.items ?? []) {
    const day = bjDay(when(it));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(it);
    else groups.push({ day, items: [it] });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        {loading ? (
          <SkeletonList count={5} itemClassName="h-20 rounded-lg" />
        ) : groups.length === 0 ? (
          <p className="border-y border-[var(--border-subtle)] py-10 text-center text-sm text-[var(--text-secondary)]">
            关注的主题最近 30 天没有精选。可以去
            <Link href="/topics" className="mx-1 font-semibold text-[var(--accent-blue)] hover:underline">主题页</Link>
            多关注几个。
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.day} aria-label={dayLabel(g.day)} className="mt-6 first:mt-0">
              <h2 className="text-[15px] font-bold text-[var(--text-secondary)]">{dayLabel(g.day)}</h2>
              <ol>
                {g.items.map((it) => (
                  <li key={it.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 border-b border-[var(--border-subtle)] py-4">
                    <time dateTime={when(it)} className="pt-0.5 text-[13px] text-[var(--text-muted)]">{bjTime(when(it))}</time>
                    <article className="min-w-0">
                      <h3 className="text-base font-semibold leading-normal">
                        <Link href={`/items/${it.id}`} className="hover:text-[var(--accent-blue)]">
                          <ItemTitle item={it} />
                        </Link>
                      </h3>
                      {it.summary && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{it.summary}</p>}
                      <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-[var(--text-muted)]">
                        <SourceTag source={it.source} />
                        {it.topics.map((t) => (
                          <span key={t} className="text-[var(--accent-blue)]">{t}</span>
                        ))}
                        {it.otherSourceCount > 0 && it.clusterKey && (
                          <Link href={`/story/${it.clusterKey}`} className="hover:underline">
                            另有 {it.otherSourceCount} 家报道
                          </Link>
                        )}
                      </p>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="关注的主题">
        <section className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <h2 className="mb-2 text-[15px] font-bold">关注的主题 {follows.length}</h2>
          <ul>
            {follows.map((slug) => (
              <li key={slug} className="flex items-center gap-2 py-1.5">
                <TopicIcon slug={slug} size="sm" />
                <Link href={`/topics/${slug}`} className="min-w-0 flex-1 truncate text-sm hover:text-[var(--accent-blue)]">
                  {names.get(slug) ?? slug}
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFollow(slug)}
                  aria-label={`取消关注 ${names.get(slug) ?? slug}`}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Link href="/topics" className="mt-2 inline-block text-sm font-semibold text-[var(--accent-blue)] hover:underline">
            关注更多主题
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">关注记在这台设备的浏览器里，换设备或清除浏览器数据后需要重新关注。</p>
        </section>
      </aside>
    </div>
  );
}
