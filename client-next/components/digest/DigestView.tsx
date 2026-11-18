'use client';
import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useIsAdmin } from '@/lib/admin';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ExternalLink, RefreshCw, ChevronDown, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { digestApi } from '../../services/api';
import { digestJobs } from '../../services/digestJobs';
import { getSourceLabel } from '../../lib/sourceMeta';
import { BackToTopFor } from '../common/BackToTop';
import { Skeleton, SkeletonList } from '../common/Loader';
import { cn } from '../../lib/utils';
import type {
  DailyDigest,
  DigestBrief,
  DigestHighlight,
  DigestSimpleItem,
  DigestModelItem,
  DigestPaperItem,
} from '../../types';
import { SourceTag } from '@/components/common/SourceTag';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getBeijingToday(): string {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD string as `M月D日` (no leading zeros). */
function formatLabel(date: string): string {
  const [, m, d] = date.split('-');
  return `${parseInt(m, 10)}月${parseInt(d, 10)}日`;
}

/**
 * Format a timestamp in Beijing time, pinned to an explicit locale and zone.
 *
 * Digest content is server-rendered, so a bare `toLocaleString()` would use the
 * container's clock (UTC) on the server and the visitor's zone in the browser,
 * producing different text for the same node and a hydration mismatch. Digest
 * dates are Beijing-based throughout, so pin both sides to Asia/Shanghai.
 */
function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Last 3 calendar months in Beijing time, newest first, stopping at today.
 *  E.g., if today is 2026-06-08 → returns Jun 8~1, May 31~1, Apr 30~1.
 *  If today is 2026-07-12 → returns Jul 12~1, Jun 30~1, May 31~1.
 *  Does NOT include future dates. */
function lastThreeMonths(): string[] {
  const days: string[] = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11
  const currentDay = now.getUTCDate();

  // Generate 3 months: current, previous, and the one before that
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const targetMonth = currentMonth - monthOffset;
    const targetYear = currentYear + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;

    // Days in this month
    const daysInMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    // For current month, stop at today; for past months, include all days
    const maxDay = monthOffset === 0 ? currentDay : daysInMonth;

    for (let day = maxDay; day >= 1; day--) {
      const yyyy = targetYear;
      const mm = String(normalizedMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      days.push(`${yyyy}-${mm}-${dd}`);
    }
  }
  return days;
}

function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const currentYear = new Date().getFullYear().toString();
  const m = parseInt(month, 10) + '月';
  return year === currentYear ? m : `${year}年${m}`;
}

function dayLabel(date: string): string {
  return parseInt(date.slice(8), 10) + '日';
}

// ── Change badge colors ───────────────────────────────────────────────────────

const CHANGE_COLOR: Record<string, string> = {
  新发布: 'text-[var(--accent-blue)] border-current',
  降价: 'text-[var(--accent-emerald)] border-current',
  涨价: 'text-[var(--accent-red)] border-current',
  性能提升: 'text-[var(--accent-cyan)] border-current',
  更新: 'text-[var(--accent-amber)] border-current',
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, count, children }: {
  id: string;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      <h2 className="mb-3 flex items-baseline gap-2 border-b border-[var(--border-default)] pb-2 text-lg font-bold">
        {title}
        {count !== undefined && count > 0 && <span className="text-[13px] font-normal text-[var(--text-muted)]">{count} 条</span>}
      </h2>
      {children}
    </section>
  );
}

// ── Highlight (今日重点) ──────────────────────────────────────────────────────

/** One of the day's key stories: a numbered row in a ruled list, not a card. */
function HighlightItem({ item, index }: { item: DigestHighlight; index: number }) {
  const others = item.event?.otherSources.map(getSourceLabel) ?? [];
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 border-b border-[var(--border-subtle)] py-5 first:pt-2 last:border-b-0">
      <span className="pt-0.5 text-lg font-bold tabular-nums text-[var(--text-muted)]" style={{ fontStretch: '80%' }}>
        {index + 1}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-bold leading-snug">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--accent-blue)]">
            {item.title}
            <ExternalLink className="ml-1 inline-block h-3.5 w-3.5 align-baseline text-[var(--text-muted)]" aria-hidden="true" />
          </a>
        </h3>
        {item.summary && <p className="mt-2 text-[15px] leading-[1.75] text-[var(--text-secondary)]">{item.summary}</p>}
        {item.whyImportant && (
          <p className="mt-2 text-sm leading-[1.75] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">为什么重要：</span>
            {item.whyImportant}
          </p>
        )}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-muted)]">
          <SourceTag source={item.source} />
          {item.affects?.length > 0 && <span>影响：{item.affects.join('、')}</span>}
          {item.event && (
            <Link href={`/story/${item.event.key}`} className="text-[var(--accent-blue)] hover:underline">
              还有 {others.join('、')} 在报道，看完整时间线
            </Link>
          )}
        </p>
      </div>
    </li>
  );
}

// ── Brief (快讯) ──────────────────────────────────────────────────────────────

function BriefItem({ item }: { item: DigestBrief }) {
  return (
    <li className="flex items-baseline gap-2 py-2 border-b border-[var(--border-subtle)] last:border-b-0">
      <SourceTag source={item.source} iconClassName="h-3 w-3" className="w-28 shrink-0 text-xs text-[var(--text-muted)]" />
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 break-words text-[15px] leading-snug hover:text-[var(--accent-blue)]"
      >
        {item.title}
      </a>
      {item.storyKey && (
        <Link
          href={`/story/${item.storyKey}`}
          className="shrink-0 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-blue)]"
          aria-label={`查看事件：${item.title}`}
        >
          事件
        </Link>
      )}
    </li>
  );
}

// ── Simple news item ──────────────────────────────────────────────────────────

function SimpleItem({ item }: { item: DigestSimpleItem }) {
  return (
    <li className="border-b border-[var(--border-subtle)] last:border-b-0">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block py-3">
        <span className="block text-[15px] font-medium leading-snug group-hover:text-[var(--accent-blue)]">{item.title}</span>
        {item.summary && <span className="mt-1 block text-[13px] leading-relaxed text-[var(--text-secondary)] line-clamp-2">{item.summary}</span>}
        <SourceTag source={item.source} iconClassName="h-3 w-3" className="mt-1 flex text-xs text-[var(--text-muted)]" />
      </a>
    </li>
  );
}

// ── Model intel table ─────────────────────────────────────────────────────────

function ModelIntelTable({ items }: { items: DigestModelItem[] }) {
  return (
    <>
      {/* Desktop: table layout */}
      <div className="hidden md:block rounded-2xl overflow-hidden border border-[var(--card-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--input-bg)]">
              {['模型', '变化', '详情', '影响'].map((h) => (
                <th key={h}
                  className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.model} className="border-t border-[var(--card-border)] hover:bg-[var(--card-bg-hover)] transition-colors">
                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                  <span className="block max-w-[140px] truncate" title={item.model}>{item.model}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium',
                    CHANGE_COLOR[item.change] ?? 'border-[var(--border-default)] text-[var(--text-secondary)]')}>
                    {item.change}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-[var(--text-secondary)] max-w-[180px]">{item.detail}</td>
                <td className="px-4 py-3 text-[13px] text-[var(--text-muted)] max-w-[180px]">{item.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards — readable instead of horizontally truncated */}
      <div className="md:hidden space-y-2.5">
        {items.map((item) => (
          <div
            key={item.model}
            className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
          >
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold text-[var(--text-primary)] text-[15px]">{item.model}</span>
              <span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-medium',
                CHANGE_COLOR[item.change] ?? 'border-[var(--border-default)] text-[var(--text-secondary)]')}>
                {item.change}
              </span>
            </div>
            {item.detail && (
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-1.5">
                {item.detail}
              </p>
            )}
            {item.impact && (
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                <span className="font-medium text-[var(--text-secondary)] mr-1">影响：</span>
                {item.impact}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Paper item ────────────────────────────────────────────────────────────────

function PaperItem({ item }: { item: DigestPaperItem }) {
  return (
    <li className="border-b border-[var(--border-subtle)] last:border-b-0">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block py-3">
        <span className="block text-[15px] font-medium leading-snug group-hover:text-[var(--accent-blue)]">{item.title}</span>
        {item.summary && <span className="mt-1 block text-[13px] leading-relaxed text-[var(--text-secondary)]">{item.summary}</span>}
        {item.impact && (
          <span className="mt-1 block text-[13px] leading-relaxed text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">行业影响：</span>
            {item.impact}
          </span>
        )}
        <SourceTag source={item.source} iconClassName="h-3 w-3" className="mt-1 flex text-xs text-[var(--text-muted)]" />
      </a>
    </li>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

/**
 * `date` comes from the `/digest/[date]` route segment rather than local state,
 * so every day is a distinct, indexable URL. `initialDigest` / `initialRecent`
 * are prefetched on the server so the report is present in the initial HTML —
 * AI crawlers don't run JS, and a digest is the most quotable content on the
 * site, so it must not depend on an effect.
 *
 * All props are optional to keep the component usable without a server parent.
 */
export function DigestView({
  date,
  initialDigest = null,
  initialRecent = [],
}: {
  date?: string;
  initialDigest?: DailyDigest | null;
  initialRecent?: { date: string; summary?: string }[];
} = {}) {
  const isAdmin = useIsAdmin();
  const today = getBeijingToday();
  const allDates = lastThreeMonths();

  // Route-driven when `date` is provided; falls back to today otherwise.
  const selectedDate = date ?? today;
  const [digest, setDigest] = useState<DailyDigest | null>(initialDigest);
  // Map: date → one-line summary (empty string if no digest)
  const [dateMap, setDateMap] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const d of initialRecent) m.set(d.date, d.summary ?? '');
    return m;
  });
  // Server already rendered this date's digest — skip the loading state.
  const [loading, setLoading] = useState(initialDigest === null);
  // Guards the per-date fetch from re-requesting what the server already sent.
  // Keyed by date so navigating to another day still fetches on the client.
  const skipInitialFetch = useRef(initialDigest !== null ? selectedDate : null);
  // Reactive read of the module-level job singleton — survives remount,
  // so generation state persists when the user switches tabs and returns.
  const generating = useSyncExternalStore(
    digestJobs.subscribe,
    () => digestJobs.isGenerating(selectedDate),
    () => false, // server snapshot: no job is ever running during SSR/prerender
  );
  const selectedRef = useRef<HTMLAnchorElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Month open/closed overrides. By default the current month and the month
  // containing the selected date are open; every other month is collapsed.
  // A user toggle records an explicit override, so past months can be expanded
  // too (a plain "collapsed" set could only ever re-collapse default-open months).
  const [monthOverrides, setMonthOverrides] = useState<Record<string, boolean>>({});
  const currentMonth = today.slice(0, 7);
  const selectedMonth = selectedDate.slice(0, 7);
  const isMonthDefaultOpen = (month: string): boolean =>
    month === currentMonth || month === selectedMonth;
  const isMonthOpen = (month: string): boolean =>
    month in monthOverrides ? monthOverrides[month] : isMonthDefaultOpen(month);
  const toggleMonth = (month: string) => {
    setMonthOverrides(prev => {
      const current = month in prev ? prev[month] : isMonthDefaultOpen(month);
      return { ...prev, [month]: !current };
    });
  };

  // Load sidebar date list (dates that have digests + their summaries).
  // Skipped when the server already supplied it.
  useEffect(() => {
    if (initialRecent.length > 0) return;
    digestApi
      .getRecent()
      .then((list: { date: string; summary?: string }[]) => {
        const m = new Map<string, string>();
        for (const d of list) m.set(d.date, d.summary ?? '');
        setDateMap(m);
      })
      .catch(() => {});
    // `initialRecent` is a server-render constant; re-running on identity
    // change would refetch on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll selected date into view on mount
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedDate]);

  /** Listen for sidebar "AI 日报" tap when already on /digest — jump to today. */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ path: string }>).detail;
      if (detail?.path === '/digest') {
        // Date lives in the URL now, so navigate instead of setting state.
        if (selectedDate !== today) router.push(`/digest/${today}`);
        rightColRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('nav:reset', handler);
    return () => window.removeEventListener('nav:reset', handler);
  }, [today, selectedDate, router]);

  // Load digest for selected date
  useEffect(() => {
    // Server already rendered this exact date — don't refetch it. Cleared on
    // first run so navigating to another date fetches normally.
    if (skipInitialFetch.current === selectedDate) {
      skipInitialFetch.current = null;
      return;
    }

    setLoading(true);
    setDigest(null);
    digestApi
      .getByDate(selectedDate)
      .then(setDigest)
      .catch(() => setDigest(null))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Re-fetch digest when generation finishes (so the UI updates even if the
  // user switched away during the job and the start() callback couldn't see them)
  useEffect(() => {
    if (generating) return;
    digestApi.getByDate(selectedDate).then((d) => {
      if (d) {
        setDigest(d);
        if (d.data?.summary !== undefined) {
          setDateMap((prev) => new Map(prev).set(selectedDate, d.data.summary ?? ''));
        }
      }
    }).catch(() => {});
    // We intentionally only run this when `generating` flips, not on date change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating]);

  const handleGenerate = async () => {
    const targetDate = selectedDate;
    await digestJobs.start(targetDate, async () => {
      try {
        await digestApi.generate(targetDate);
        const d = await digestApi.getByDate(targetDate).catch(() => null);
        // Only update view if the user is still looking at this date
        if (selectedDate === targetDate) setDigest(d);
        if (d?.data?.summary !== undefined) {
          setDateMap((prev) => new Map(prev).set(targetDate, d!.data.summary ?? ''));
        }
      } catch {}
    });
  };

  // Group all 60 days by YYYY-MM
  const groups: { month: string; dates: string[] }[] = [];
  for (const date of allDates) {
    const month = date.slice(0, 7);
    if (groups.length === 0 || groups[groups.length - 1].month !== month) {
      groups.push({ month, dates: [] });
    }
    groups[groups.length - 1].dates.push(date);
  }

  const data = digest?.data;
  const hasContent = data && (
    (data.highlights?.length ?? 0) > 0 ||
    (data.domestic?.length ?? 0) > 0 ||
    (data.international?.length ?? 0) > 0 ||
    (data.modelIntel?.length ?? 0) > 0 ||
    (data.products?.length ?? 0) > 0 ||
    (data.community?.length ?? 0) > 0 ||
    (data.papers?.length ?? 0) > 0 ||
    (data.briefs?.length ?? 0) > 0
  );

  return (
    <div className="mx-auto flex h-full max-w-[1180px] overflow-hidden">
      {/* ── Left: timeline ──────────────────────────────────── */}
      <div className="hidden lg:flex w-[232px] shrink-0 flex-col border-r border-[var(--border-subtle)] overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="text-lg font-bold">AI 日报</h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">每天早上 8 点出一期</p>
        </div>

        <div className="flex-1 overflow-y-scroll">
          {groups.map(({ month, dates }) => {
            const datesWithDigest = dates.filter(d => dateMap.has(d)).length;
            // List only days that actually have a digest, plus today — today is
            // kept even before its digest exists so it stays reachable as the
            // entry point for manual generation. Listing the full calendar would
            // pad the sidebar with dozens of "暂无日报" rows on a fresh install.
            const visibleDates = dates.filter(d => dateMap.has(d) || d === today);
            // Only months with at least one digest (or the current month) can be
            // expanded — an empty past month has nothing to show.
            const expandable = month === currentMonth || datesWithDigest > 0;
            const open = expandable && isMonthOpen(month);
            return (
              <div key={month}>
                {/* Month header — clickable to toggle collapse when expandable */}
                <button
                  type="button"
                  onClick={() => expandable && toggleMonth(month)}
                  disabled={!expandable}
                  className={cn(
                    'sticky top-0 z-10 w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] border-b border-[var(--border-subtle)] transition-colors',
                    expandable ? 'hover:bg-[var(--card-bg)] cursor-pointer' : 'cursor-default opacity-50',
                  )}
                >
                  {expandable
                    ? (open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
                    : <span className="w-3 h-3" />}
                  <span className="flex-1 text-left">{monthLabel(month)}</span>
                  {datesWithDigest > 0 && (
                    <span className="text-[11px] font-normal text-[var(--text-muted)]">
                      {datesWithDigest} 期
                    </span>
                  )}
                </button>

                {/* Date items — only render when month is open */}
                {open && visibleDates.map((date) => {
                const isToday = date === today;
                const isSelected = date === selectedDate;
                const hasDigest = dateMap.has(date);
                const summary = dateMap.get(date) ?? '';

                return (
                  <Link
                    key={date}
                    href={`/digest/${date}`}
                    ref={isSelected ? selectedRef : undefined}
                    aria-current={isSelected ? 'page' : undefined}
                    className={cn(
                      'block w-full text-left px-4 py-2.5 transition-all border-b border-[var(--border-subtle)]/40',
                      isSelected
                        ? 'bg-[var(--tab-active-bg)] border-l-2 border-l-[var(--accent-blue)]'
                        : 'hover:bg-[var(--card-bg)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Day number */}
                      <span className={cn(
                        'text-sm font-bold tabular-nums shrink-0 w-8',
                        isSelected ? 'text-[var(--accent-blue)] dark:text-blue-400' : isToday ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                      )}>
                        {dayLabel(date)}
                      </span>

                      {/* Today badge */}
                      {isToday && (
                        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-[var(--accent-blue)]/20 text-[var(--accent-blue)] dark:bg-blue-500/20 dark:text-blue-400 font-bold leading-none">
                          今
                        </span>
                      )}

                      {/* Has-data indicator */}
                      {!isToday && hasDigest && (
                        <div className="w-1 h-1 rounded-full bg-[var(--accent-blue)] dark:bg-blue-400 shrink-0" />
                      )}
                    </div>

                    {/* Summary preview */}
                    {hasDigest && summary ? (
                      <p className={cn(
                        'text-[11px] leading-snug mt-0.5 truncate',
                        isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
                      )}>
                        {summary}
                      </p>
                    ) : !hasDigest ? (
                      <p className="text-[11px] text-[var(--text-muted)] opacity-40 mt-0.5">
                        暂无日报
                      </p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: content ──────────────────────────────────── */}
      <div ref={rightColRef} className="flex-1 overflow-y-scroll relative flex flex-col">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-8 bg-[var(--bg-base)] border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {selectedDate === today ? '今日日报' : `${formatLabel(selectedDate)}日报`}
            </span>
            {data?.itemCount !== undefined && (
              <span className="text-[11px] text-[var(--text-muted)]">基于 {data.itemCount} 条资讯</span>
            )}
          </div>
          {/* Show top-right button only when content exists (regen). Empty state has its own '立即生成日报' button. */}
          {hasContent && isAdmin && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', generating && 'animate-spin')} />
              {generating ? '生成中...' : '重新生成'}
            </button>
          )}
        </div>

        <div className="flex flex-1 gap-10 px-4 py-6 sm:px-8">
        <div className="flex min-w-0 max-w-[760px] flex-1 flex-col">
          {loading ? (
            <LoadingSkeleton />
          ) : !hasContent ? (
            <DigestEmptyState
              date={selectedDate}
              today={today}
              onGenerate={isAdmin ? handleGenerate : undefined}
              generating={generating}
            />
          ) : (
            <div className="space-y-8">
              {/* The day in one line. */}
              {data!.summary && (
                <p className="text-[17px] font-medium leading-relaxed">{data!.summary}</p>
              )}

              {/* 今日重点 + 快讯 first: the day's news before the per-category digests. */}
              {data!.highlights?.length > 0 && (
                <Section id="d-highlights" title="今日重点" count={data!.highlights.length}>
                  <ol>
                    {data!.highlights.map((h, i) => <HighlightItem key={h.url} item={h} index={i} />)}
                  </ol>
                </Section>
              )}

              {(data!.briefs?.length ?? 0) > 0 && (
                <Section id="d-briefs" title="快讯" count={data!.briefs!.length}>
                  <ul>
                    {data!.briefs!.map((item) => <BriefItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data!.modelIntel?.length > 0 && (
                <Section id="d-models" title="模型情报" count={data!.modelIntel.length}>
                  <ModelIntelTable items={data!.modelIntel} />
                </Section>
              )}

              {data!.domestic?.length > 0 && (
                <Section id="d-domestic" title="国内动态" count={data!.domestic.length}>
                  <ul>
                    {data!.domestic.map((item) => <SimpleItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data!.international?.length > 0 && (
                <Section id="d-international" title="国外动态" count={data!.international.length}>
                  <ul>
                    {data!.international.map((item) => <SimpleItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data!.products?.length > 0 && (
                <Section id="d-products" title="AI 产品动态" count={data!.products.length}>
                  <ul>
                    {data!.products.map((item) => <SimpleItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data!.community?.length > 0 && (
                <Section id="d-community" title="社区热议" count={data!.community.length}>
                  <ul>
                    {data!.community.map((item) => <SimpleItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data!.papers?.length > 0 && (
                <Section id="d-papers" title="论文与技术趋势" count={data!.papers.length}>
                  <ul>
                    {data!.papers.map((item) => <PaperItem key={item.url} item={item} />)}
                  </ul>
                </Section>
              )}

              {data?.generatedAt && (
                <p className="text-[11px] text-[var(--text-muted)] pb-4">
                  {/* Explicit timeZone: this now renders on the server too, and
                      the container's UTC clock would otherwise disagree with the
                      browser's local time and trip a hydration mismatch. */}
                  日报生成于 {formatGeneratedAt(data.generatedAt)}
                </p>
              )}
            </div>
          )}
        </div>
        {hasContent && !loading && <SectionIndex data={data!} />}
        </div>

        {/* Date navigation footer — always visible, even in empty state */}
        <DateNav
          selectedDate={selectedDate}
          today={today}
          onSelect={(d) => router.push(`/digest/${d}`)}
        />

        <BackToTopFor getContainer={() => rightColRef.current} />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Bottom date pager: ← 前一日   ·   回到今日   ·   后一日 → */
function DateNav({
  selectedDate,
  today,
  onSelect,
}: {
  selectedDate: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const shift = (days: number): string => {
    // Parse YYYY-MM-DD as a UTC midnight date, then advance whole UTC days.
    // Doing arithmetic on `${date}T00:00:00+08:00` triggers a timezone shift
    // (Beijing midnight = UTC 16:00 the previous day), so getUTCDate()/+1
    // would return a date one off from what the user expects.
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  };

  const prev = shift(-1);
  const next = shift(1);
  const canGoNext = next <= today;
  const isToday = selectedDate === today;

  return (
    <nav className="border-t border-[var(--border-subtle)]">
      <div className="flex items-center justify-between max-w-[760px] px-4 py-3 sm:px-8 text-sm gap-2">
        <button
          type="button"
          onClick={() => onSelect(prev)}
          className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors min-w-0"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0" />
          <span className="truncate">前一日 {formatLabel(prev)}</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect(today)}
          disabled={isToday}
          className={cn(
            'shrink-0 text-xs px-2.5 py-1 rounded-md transition-colors',
            isToday
              ? 'text-[var(--text-muted)] cursor-default'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
          )}
        >
          {isToday ? '今日' : '回到今日'}
        </button>

        {canGoNext ? (
          <button
            type="button"
            onClick={() => onSelect(next)}
            className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors min-w-0"
          >
            <span className="truncate">后一日 {formatLabel(next)}</span>
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 shrink-0" />
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[var(--text-muted)] opacity-50 cursor-default min-w-0">
            <span className="truncate">已是最新一天</span>
          </span>
        )}
      </div>
    </nav>
  );
}

/** Sections of the open digest, in page order, for the index beside the text. */
function digestSections(data: DailyDigest['data']): Array<{ id: string; title: string; count: number }> {
  return [
    { id: 'd-highlights', title: '今日重点', count: data.highlights?.length ?? 0 },
    { id: 'd-briefs', title: '快讯', count: data.briefs?.length ?? 0 },
    { id: 'd-models', title: '模型情报', count: data.modelIntel?.length ?? 0 },
    { id: 'd-domestic', title: '国内动态', count: data.domestic?.length ?? 0 },
    { id: 'd-international', title: '国外动态', count: data.international?.length ?? 0 },
    { id: 'd-products', title: 'AI 产品动态', count: data.products?.length ?? 0 },
    { id: 'd-community', title: '社区热议', count: data.community?.length ?? 0 },
    { id: 'd-papers', title: '论文与技术趋势', count: data.papers?.length ?? 0 },
  ].filter((s) => s.count > 0);
}

/**
 * Section index in the space right of the text on wide screens. Plain anchor
 * links: the browser scrolls the digest column to the section.
 */
function SectionIndex({ data }: { data: DailyDigest['data'] }) {
  const sections = digestSections(data);
  if (sections.length < 2) return null;
  return (
    <nav aria-label="本期目录" className="hidden w-40 shrink-0 xl:block">
      <div className="sticky top-16">
        <p className="mb-2 text-xs text-[var(--text-muted)]">本期目录</p>
        <ul className="space-y-0.5 border-l border-[var(--border-default)] text-sm">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="-ml-px flex justify-between gap-2 border-l border-transparent py-1 pl-3 text-[var(--text-secondary)] hover:border-[var(--accent-blue)] hover:text-[var(--text-primary)]"
              >
                {s.title}
                <span className="tabular-nums text-[var(--text-muted)]">{s.count}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12" />
      <SkeletonList count={3} itemClassName="h-36" />
      <Skeleton className="h-24" />
    </div>
  );
}

function DigestEmptyState({ date, today, onGenerate, generating }: {
  /** Admin only; visitors get no generate button. */
  date: string; today: string; onGenerate?: () => void; generating: boolean;
}) {
  const isToday = date === today;
  return (
    <div className="flex flex-col items-center py-16 px-6 text-center border-y border-[var(--border-subtle)]">
      <p className="text-[15px] font-medium text-[var(--text-primary)]">
        {isToday ? '今日日报尚未生成' : `${date} 暂无日报`}
      </p>
      <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-md">
        {isToday ? '每天北京时间早上 8 点自动生成，请稍后再来' : '这一天没有生成日报'}
      </p>

      {onGenerate && date <= today && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-5 flex items-center gap-2 rounded-lg bg-[var(--accent-blue)] px-5 py-2 text-sm font-medium text-[var(--on-accent)] disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
          {generating ? '正在生成' : '生成这一天的日报'}
        </button>
      )}
    </div>
  );
}
