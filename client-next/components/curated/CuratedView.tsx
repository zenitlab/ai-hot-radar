'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { curatedApi } from '../../services/api';
import { CATEGORY_LABEL } from '../../lib/categories';
import { sourceCountColor } from '../../lib/heat';
import { CURATED_PAGE_SIZE } from '../../lib/curated';
import { HotspotTabs } from '../hotspot/HotspotTabs';
import { BackToTop } from '../common/BackToTop';
import { SkeletonList } from '../common/Loader';
import type { Hotspot, HotspotTab } from '../../types';
import { ItemTitle } from '@/components/common/ItemTitle';
import { SourceTag } from '@/components/common/SourceTag';

const WEEK = '日一二三四五六';

const when = (h: Hotspot) => h.publishedAt || h.createdAt;

/** Beijing calendar day of an ISO time, as YYYY-MM-DD; same on server and client. */
const bjDay = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 10);

const bjTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });

function dayHeading(day: string, today: string) {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const yesterday = bjDay(new Date(new Date(`${today}T12:00:00+08:00`).getTime() - 86_400_000).toISOString());
  const rel = day === today ? '今天' : day === yesterday ? '昨天' : '';
  return { label: `${m}月${d}日 星期${weekday}`, rel };
}

/** Consecutive runs of items from the same Beijing day, in list order. */
function groupByDay(items: Hotspot[]) {
  const groups: Array<{ day: string; items: Hotspot[] }> = [];
  for (const it of items) {
    const day = bjDay(when(it));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(it);
    else groups.push({ day, items: [it] });
  }
  return groups;
}

function FeedItem({ item }: { item: Hotspot }) {
  const n = item.sourceCount ?? 1;
  const tick = sourceCountColor(n);
  const category = item.category ? CATEGORY_LABEL[item.category] : null;
  return (
    <li className="grid grid-cols-[40px_4px_minmax(0,1fr)] gap-x-3 border-b border-[var(--border-subtle)] py-4 sm:grid-cols-[44px_4px_minmax(0,1fr)]">
      <time dateTime={when(item)} className="pt-0.5 text-[13px] text-[var(--text-muted)]">
        {bjTime(when(item))}
      </time>
      <span
        className="min-h-6 w-1 rounded-full"
        style={{ background: tick ?? 'transparent' }}
        title={n > 1 ? `${n} 家来源报道了这件事` : undefined}
        aria-hidden="true"
      />
      <article className="min-w-0">
        <h3 className="text-base font-semibold leading-normal sm:text-[17px]">
          <Link href={`/items/${item.id}`} className="hover:text-[var(--accent-blue)]">
            <ItemTitle item={item} />
          </Link>
        </h3>
        {item.summary && (
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-2">{item.summary}</p>
        )}
        <p className="mt-1.5 flex flex-wrap gap-x-3 text-[13px] text-[var(--text-muted)]">
          <SourceTag source={item.source} />
          {n > 1 && item.clusterKey && (
            <Link href={`/story/${item.clusterKey}`} className="font-medium hover:underline" style={{ color: tick ?? undefined }}>
              {n} 家来源
            </Link>
          )}
          {category && <span>{category}</span>}
          {item.qualityScore != null && <span>评分 {Math.round(item.qualityScore)}</span>}
        </p>
      </article>
    </li>
  );
}

/**
 * The 精选 feed: the last 7 days of curated items, newest first, grouped by
 * Beijing day. Showing days rather than "today only" keeps the page full in
 * the early hours, when today has nothing yet.
 *
 * `initialItems` / `initialTotal` come from the server (app/curated/page.tsx)
 * so the default view is in the first HTML for crawlers. `top` and `rail` are
 * server-rendered blocks placed above the feed and in the right column.
 */
export function CuratedView({
  initialItems = [],
  initialTotal = 0,
  today,
  top,
  rail,
}: {
  initialItems?: Hotspot[];
  initialTotal?: number;
  /** Beijing date of the request, YYYY-MM-DD; fixes 今天/昨天 to the server's clock. */
  today: string;
  top?: React.ReactNode;
  rail?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<HotspotTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState<Hotspot[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // The server already sent the default view; only refetch once filters change.
  const filtersTouched = useRef(false);

  const filterOpts = () => {
    const opts: { category?: string; region?: string; search?: string } = {};
    if (activeTab === 'domestic' || activeTab === 'international') opts.region = activeTab;
    else if (activeTab !== 'all') opts.category = activeTab;
    if (appliedSearch) opts.search = appliedSearch;
    return opts;
  };

  useEffect(() => {
    if (!filtersTouched.current) return;
    let cancelled = false;
    curatedApi
      .getAll('week', CURATED_PAGE_SIZE, 0, filterOpts())
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // filterOpts reads exactly these two values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, appliedSearch]);

  const changeFilter = (apply: () => void) => {
    filtersTouched.current = true;
    setLoading(true);
    apply();
  };

  const loadMore = () => {
    setLoadingMore(true);
    curatedApi
      .getAll('week', CURATED_PAGE_SIZE, items.length, filterOpts())
      .then((res) => {
        const seen = new Set(items.map((i) => i.id));
        setItems([...items, ...(res.items || []).filter((i: Hotspot) => !seen.has(i.id))]);
        setTotal(res.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const search = () => changeFilter(() => setAppliedSearch(searchInput.trim()));
  const clearSearch = () => {
    setSearchInput('');
    changeFilter(() => setAppliedSearch(''));
    searchRef.current?.focus();
  };

  const groups = groupByDay(items);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:pt-8">
      <div className="min-w-0">
        <h1 className="sr-only">AI 精选资讯：今日 AI 热点与大模型动态</h1>
        {top}

        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold sm:text-xl">精选</h2>
          <p className="text-[13px] text-[var(--text-muted)]">最近 7 天按评分筛出的 {total} 条，按时间排列</p>
        </div>

        <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <div className="min-w-0 flex-1">
            <HotspotTabs activeTab={activeTab} onChange={(t) => changeFilter(() => setActiveTab(t))} />
          </div>
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
            className="relative shrink-0"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              aria-label="搜索精选"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索标题和摘要"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] py-1.5 pl-8 pr-7 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none lg:w-52"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="清空搜索"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>

        {appliedSearch && !loading && (
          <p className="mb-2 text-[13px] text-[var(--text-muted)]">
            包含「{appliedSearch}」的精选共 {total} 条
          </p>
        )}

        {loading ? (
          <SkeletonList count={5} itemClassName="h-20 rounded-lg" />
        ) : items.length === 0 ? (
          <div className="border-y border-[var(--border-subtle)] py-10 text-center text-sm text-[var(--text-secondary)]">
            {appliedSearch ? (
              <>
                最近 7 天没有包含「{appliedSearch}」的精选。
                <button type="button" onClick={clearSearch} className="ml-1 font-semibold text-[var(--accent-blue)] hover:underline">
                  清空搜索
                </button>
              </>
            ) : activeTab !== 'all' ? (
              <>
                这个分类最近 7 天没有精选。
                <button
                  type="button"
                  onClick={() => changeFilter(() => setActiveTab('all'))}
                  className="ml-1 font-semibold text-[var(--accent-blue)] hover:underline"
                >
                  看全部
                </button>
              </>
            ) : (
              <>
                最近 7 天还没有精选内容，可以先看
                <Link href="/hotspot" className="mx-1 font-semibold text-[var(--accent-blue)] hover:underline">
                  全部动态
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {groups.map((g) => {
              const { label, rel } = dayHeading(g.day, today);
              return (
                <section key={g.day} aria-label={label} className="mt-6 first:mt-2">
                  <h3 className="flex items-baseline gap-2 text-[15px] font-bold text-[var(--text-secondary)]">
                    {label}
                    {rel && <span className="text-[13px] font-normal text-[var(--text-muted)]">{rel}</span>}
                  </h3>
                  <ol>
                    {g.items.map((item) => (
                      <FeedItem key={item.id} item={item} />
                    ))}
                  </ol>
                </section>
              );
            })}
            {items.length < total && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mt-6 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] py-2.5 text-sm font-medium hover:border-[var(--card-border-hover)] disabled:opacity-60"
              >
                {loadingMore ? '加载中' : `加载更多（还有 ${total - items.length} 条）`}
              </button>
            )}
          </>
        )}
      </div>

      {rail}
      <BackToTop />
    </div>
  );
}
