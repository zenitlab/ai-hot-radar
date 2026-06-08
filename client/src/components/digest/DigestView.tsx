import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  ExternalLink, RefreshCw, Zap, CalendarDays, ChevronDown, ChevronRight,
  ChevronLeft, ArrowRight, Flame, Cpu, Globe2, Globe, Package, Users, BookOpen,
} from 'lucide-react';
import { digestApi } from '../../services/api';
import { digestJobs } from '../../services/digestJobs';
import { getSourceIcon, getSourceLabel } from '../../lib/sourceMeta';
import { BackToTopFor } from '../common/BackToTop';
import { Skeleton, SkeletonList } from '../common/Loader';
import { cn } from '../../lib/utils';
import type {
  DailyDigest,
  DigestHighlight,
  DigestSimpleItem,
  DigestModelItem,
  DigestPaperItem,
} from '../../types';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getBeijingToday(): string {
  const now = new Date();
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Last 3 calendar months in Beijing time, newest first.
 *  E.g., if today is 2026-06-08 → returns all days in Jun, May, Apr.
 *  If today is 2026-07-12 → returns all days in Jul, Jun, May. */
function lastThreeMonths(): string[] {
  const days: string[] = [];
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth(); // 0-11

  // Generate 3 months: current, previous, and the one before that
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const targetMonth = currentMonth - monthOffset;
    const targetYear = currentYear + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;

    // Days in this month
    const daysInMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    for (let day = daysInMonth; day >= 1; day--) {
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
  新发布: 'bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] dark:bg-blue-500/15 dark:text-blue-400',
  降价:   'bg-green-500/15 text-green-400',
  涨价:   'bg-red-500/15 text-red-400',
  性能提升: 'bg-purple-500/15 text-purple-400',
  更新:   'bg-amber-500/15 text-amber-400',
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, count, children, accent = 'blue' }: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  children: React.ReactNode;
  accent?: 'red' | 'blue' | 'emerald' | 'amber' | 'purple' | 'cyan' | 'pink';
}) {
  const accentClass = {
    red:     'bg-red-500/10 text-red-500 dark:text-red-400',
    blue:    'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] dark:bg-blue-500/10 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple:  'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    cyan:    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    pink:    'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  }[accent];

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg', accentClass)}>
          {icon}
        </span>
        <h2 className="font-bold text-[var(--text-primary)] text-base tracking-tight">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)]">
            {count}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Highlight card ────────────────────────────────────────────────────────────

function HighlightCard({ item }: { item: DigestHighlight }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-5 sm:p-6 rounded-3xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Source */}
      <div className="flex items-center gap-1 text-[13px] text-[var(--text-muted)] mb-2">
        {getSourceIcon(item.source, 'w-3.5 h-3.5')}
        {getSourceLabel(item.source)}
      </div>

      {/* Title — large, semibold */}
      <h3 className="text-[17px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] dark:group-hover:text-blue-400 transition-colors leading-snug mb-2.5">
        {item.title}
        <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 mb-0.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="text-[14px] text-[var(--text-secondary)] mb-3.5 leading-[1.7]">
          {item.summary}
        </p>
      )}

      {/* Why important — quote-style block */}
      {item.whyImportant && (
        <div className="px-4 py-3 rounded-2xl bg-[var(--accent-blue)]/6 border border-[var(--accent-blue)]/15 dark:bg-blue-500/8 dark:border-blue-500/15 mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-blue)] dark:text-blue-400 mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3" /> 为什么重要
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] leading-[1.65]">{item.whyImportant}</p>
        </div>
      )}

      {/* Affects — filled chips */}
      {item.affects?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.affects.map((a) => (
            <span
              key={a}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            >
              {a}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

// ── Simple news item ──────────────────────────────────────────────────────────

function SimpleItem({ item }: { item: DigestSimpleItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-2 p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] transition-all group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          {item.title}
        </p>
        {item.summary && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">{item.summary}</p>
        )}
        <p className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1">
          {getSourceIcon(item.source, 'w-3 h-3')}
          {getSourceLabel(item.source)}
        </p>
      </div>
      <ExternalLink className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
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
                  className="text-left px-4 py-2.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-t border-[var(--card-border)] hover:bg-[var(--card-bg-hover)] transition-colors">
                <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                  <span className="block max-w-[140px] truncate" title={item.model}>{item.model}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium',
                    CHANGE_COLOR[item.change] ?? 'bg-[var(--input-bg)] text-[var(--text-secondary)]')}>
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
        {items.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]"
          >
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold text-[var(--text-primary)] text-[15px]">{item.model}</span>
              <span className={cn('text-[11px] px-2 py-0.5 rounded font-medium',
                CHANGE_COLOR[item.change] ?? 'bg-[var(--input-bg)] text-[var(--text-secondary)]')}>
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
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="block p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] transition-all group">
      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {item.title}
      </p>
      {item.summary && (
        <p className="text-xs text-[var(--text-secondary)] mt-1">{item.summary}</p>
      )}
      {item.impact && (
        <p className="text-xs text-amber-500 mt-1.5">行业影响：{item.impact}</p>
      )}
      <p className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1">
        {getSourceIcon(item.source, 'w-3 h-3')}
        {getSourceLabel(item.source)}
      </p>
    </a>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function DigestView() {
  const today = getBeijingToday();
  const allDates = lastThreeMonths();

  const [selectedDate, setSelectedDate] = useState(today);
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  // Map: date → one-line summary (empty string if no digest)
  const [dateMap, setDateMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  // Reactive read of the module-level job singleton — survives remount,
  // so generation state persists when the user switches tabs and returns.
  const generating = useSyncExternalStore(
    digestJobs.subscribe,
    () => digestJobs.isGenerating(selectedDate),
  );
  const selectedRef = useRef<HTMLButtonElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

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

  // Load sidebar date list (dates that have digests + their summaries)
  useEffect(() => {
    digestApi
      .getRecent()
      .then((list: { date: string; summary?: string }[]) => {
        const m = new Map<string, string>();
        for (const d of list) m.set(d.date, d.summary ?? '');
        setDateMap(m);
      })
      .catch(() => {});
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
        setSelectedDate(today);
        rightColRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('nav:reset', handler);
    return () => window.removeEventListener('nav:reset', handler);
  }, [today]);

  // Load digest for selected date
  useEffect(() => {
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
    (data.papers?.length ?? 0) > 0
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: timeline ──────────────────────────────────── */}
      <div className="hidden lg:flex w-[220px] flex-shrink-0 flex-col border-r border-[var(--border-subtle)] overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="flex items-center gap-2.5 text-base font-bold text-[var(--text-primary)] tracking-tight">
            <CalendarDays className="w-4 h-4 text-[var(--accent-blue)] dark:text-blue-400" />
            AI 日报
          </h1>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">AI 行业每日情报</p>
        </div>

        <div className="flex-1 overflow-y-scroll">
          {groups.map(({ month, dates }) => {
            const datesWithDigest = dates.filter(d => dateMap.has(d)).length;
            // Past months list only the days that actually have a digest; the
            // current month keeps the full calendar so today stays reachable.
            const visibleDates = month === currentMonth ? dates : dates.filter(d => dateMap.has(d));
            // Only months with at least one digest (or the current month) can be
            // expanded — an empty past month has nothing to show.
            const expandable = month === currentMonth || datesWithDigest > 0;
            const open = expandable && isMonthOpen(month);
            return (
              <div key={month}>
                {/* Month header — clickable to toggle collapse when expandable */}
                <button
                  onClick={() => expandable && toggleMonth(month)}
                  disabled={!expandable}
                  className={cn(
                    'sticky top-0 z-10 w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-base)] border-b border-[var(--border-subtle)] transition-colors',
                    expandable ? 'hover:bg-[var(--card-bg)] cursor-pointer' : 'cursor-default opacity-50',
                  )}
                >
                  {expandable
                    ? (open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)
                    : <span className="w-3 h-3" />}
                  <span className="flex-1 text-left">{monthLabel(month)}</span>
                  {datesWithDigest > 0 && (
                    <span className="text-[10px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
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
                  <button
                    key={date}
                    ref={isSelected ? selectedRef : undefined}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 transition-all border-b border-[var(--border-subtle)]/40',
                      isSelected
                        ? 'bg-[var(--accent-blue)]/10 border-l-2 border-l-[var(--accent-blue)] dark:bg-blue-500/10 dark:border-l-blue-500'
                        : 'hover:bg-[var(--card-bg)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Day number */}
                      <span className={cn(
                        'text-sm font-mono font-bold shrink-0 w-8',
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
                        isSelected ? 'text-[var(--accent-blue)]/80 dark:text-blue-300/80' : 'text-[var(--text-muted)]',
                      )}>
                        {summary}
                      </p>
                    ) : !hasDigest ? (
                      <p className="text-[11px] text-[var(--text-muted)] opacity-40 mt-0.5">
                        暂无日报
                      </p>
                    ) : null}
                  </button>
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
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-[var(--bg-base)]/90 backdrop-blur border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {selectedDate === today ? '今日日报' : selectedDate}
            </span>
            {data?.itemCount !== undefined && (
              <span className="text-[11px] text-[var(--text-muted)]">基于 {data.itemCount} 条资讯</span>
            )}
          </div>
          {/* Show top-right button only when content exists (regen). Empty state has its own '立即生成日报' button. */}
          {hasContent && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', generating && 'animate-spin')} />
              {generating ? '生成中...' : '重新生成'}
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col px-6 py-6 max-w-3xl">
          {loading ? (
            <LoadingSkeleton />
          ) : !hasContent ? (
            <DigestEmptyState
              date={selectedDate}
              today={today}
              onGenerate={handleGenerate}
              generating={generating}
            />
          ) : (
            <div className="space-y-8">
              {/* Summary banner — soft accent bar in light mode, gradient in dark */}
              {data!.summary && (
                <div className="px-4 py-3 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] border-l-4 border-l-[var(--accent-blue)] dark:bg-gradient-to-r dark:from-blue-500/10 dark:to-purple-500/8 dark:border dark:border-blue-500/20">
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    <span className="text-[var(--text-muted)] text-xs mr-2 font-medium">今日一句话</span>
                    {data!.summary}
                  </p>
                </div>
              )}

              {/* 今日重点 */}
              {data!.highlights?.length > 0 && (
                <Section icon={<Flame className="w-4 h-4" />} title="今日重点" count={data!.highlights.length} accent="red">
                  <div className="space-y-3">
                    {data!.highlights.map((h, i) => <HighlightCard key={i} item={h} />)}
                  </div>
                </Section>
              )}

              {/* 模型情报 */}
              {data!.modelIntel?.length > 0 && (
                <Section icon={<Cpu className="w-4 h-4" />} title="模型情报" count={data!.modelIntel.length} accent="blue">
                  <ModelIntelTable items={data!.modelIntel} />
                </Section>
              )}

              {/* 国内 + 国外 — side by side on wide screens */}
              {(data!.domestic?.length > 0 || data!.international?.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {data!.domestic?.length > 0 && (
                    <Section icon={<Globe2 className="w-4 h-4" />} title="国内动态" count={data!.domestic.length} accent="emerald">
                      <div className="space-y-2">
                        {data!.domestic.map((item, i) => <SimpleItem key={i} item={item} />)}
                      </div>
                    </Section>
                  )}
                  {data!.international?.length > 0 && (
                    <Section icon={<Globe className="w-4 h-4" />} title="国外动态" count={data!.international.length} accent="cyan">
                      <div className="space-y-2">
                        {data!.international.map((item, i) => <SimpleItem key={i} item={item} />)}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* AI 产品 */}
              {data!.products?.length > 0 && (
                <Section icon={<Package className="w-4 h-4" />} title="AI 产品动态" count={data!.products.length} accent="purple">
                  <div className="space-y-2">
                    {data!.products.map((item, i) => <SimpleItem key={i} item={item} />)}
                  </div>
                </Section>
              )}

              {/* 社区热议 */}
              {data!.community?.length > 0 && (
                <Section icon={<Users className="w-4 h-4" />} title="社区热议" count={data!.community.length} accent="amber">
                  <div className="space-y-2">
                    {data!.community.map((item, i) => <SimpleItem key={i} item={item} />)}
                  </div>
                </Section>
              )}

              {/* 论文趋势 */}
              {data!.papers?.length > 0 && (
                <Section icon={<BookOpen className="w-4 h-4" />} title="论文 & 技术趋势" count={data!.papers.length} accent="pink">
                  <div className="space-y-2">
                    {data!.papers.map((item, i) => <PaperItem key={i} item={item} />)}
                  </div>
                </Section>
              )}

              {data?.generatedAt && (
                <p className="text-[11px] text-[var(--text-muted)] pb-4">
                  日报生成于 {new Date(data.generatedAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Date navigation footer — always visible, even in empty state */}
        <DateNav
          selectedDate={selectedDate}
          today={today}
          onSelect={(d) => setSelectedDate(d)}
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

  const formatLabel = (date: string): string => {
    const [, m, d] = date.split('-');
    return `${parseInt(m, 10)}月${parseInt(d, 10)}日`;
  };

  return (
    <nav className="border-t border-[var(--border-subtle)]">
      <div className="flex items-center justify-between max-w-3xl px-6 py-3 text-sm gap-2">
        <button
          onClick={() => onSelect(prev)}
          className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors min-w-0"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 shrink-0" />
          <span className="truncate">前一日 · {formatLabel(prev)}</span>
        </button>

        <button
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
            onClick={() => onSelect(next)}
            className="group flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 transition-colors min-w-0"
          >
            <span className="truncate">后一日 · {formatLabel(next)}</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 shrink-0" />
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-[var(--text-muted)] opacity-50 cursor-default min-w-0">
            <span className="truncate">后一日 · —</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </span>
        )}
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
  date: string; today: string; onGenerate: () => void; generating: boolean;
}) {
  const isToday = date === today;
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--card-bg)]/40 min-h-[320px]">
      {/* Calendar illustration with halo */}
      <div className="relative text-[var(--accent-blue)] dark:text-blue-400 opacity-70">
        <svg width="84" height="84" viewBox="0 0 96 96" fill="none">
          <defs>
            <radialGradient id="digest-empty-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="70%" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="48" cy="48" r="46" fill="url(#digest-empty-halo)" />
          <rect x="22" y="28" width="52" height="46" rx="6" stroke="currentColor" strokeWidth="1.6" fill="currentColor" fillOpacity="0.08" />
          <line x1="22" y1="40" x2="74" y2="40" stroke="currentColor" strokeWidth="1.6" />
          <line x1="34" y1="22" x2="34" y2="32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="62" y1="22" x2="62" y2="32" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="35" cy="52" r="1.8" fill="currentColor" />
          <circle cx="48" cy="52" r="1.8" fill="currentColor" />
          <circle cx="61" cy="52" r="1.8" fill="currentColor" />
          <circle cx="35" cy="62" r="1.8" fill="currentColor" fillOpacity="0.5" />
          <circle cx="48" cy="62" r="1.8" fill="currentColor" fillOpacity="0.5" />
        </svg>
      </div>

      <p className="mt-4 text-[15px] font-medium text-[var(--text-primary)]">
        {isToday ? '今日日报尚未生成' : `${date} 暂无日报`}
      </p>
      <p className="mt-1.5 text-sm text-[var(--text-muted)] max-w-md">
        {isToday ? '每天北京时间早上 8:00 自动生成，也可手动触发' : '该日期暂无数据，可手动触发生成'}
      </p>

      {date <= today && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="mt-5 flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent-blue)]/85 text-white text-sm font-medium hover:bg-[var(--accent-blue)] transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
          {generating ? 'AI 正在分析资讯...' : '立即生成日报'}
        </button>
      )}
    </div>
  );
}
