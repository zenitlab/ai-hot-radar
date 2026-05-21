import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { ExternalLink, RefreshCw, Zap, CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { digestApi } from '../../services/api';
import { digestJobs } from '../../services/digestJobs';
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

/** Last `n` days in Beijing time, newest first */
function last60Days(): string[] {
  const days: string[] = [];
  const base = Date.now() + 8 * 60 * 60 * 1000;
  for (let i = 0; i < 62; i++) {
    days.push(new Date(base - i * 86400000).toISOString().slice(0, 10));
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
  新发布: 'bg-blue-500/15 text-blue-400',
  降价:   'bg-green-500/15 text-green-400',
  涨价:   'bg-red-500/15 text-red-400',
  性能提升: 'bg-purple-500/15 text-purple-400',
  更新:   'bg-amber-500/15 text-amber-400',
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, count, children }: {
  icon: string; title: string; count?: number; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg leading-none">{icon}</span>
        <h2 className="font-bold text-[var(--text-primary)] text-base">{title}</h2>
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
    <div className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden">
      <div className="p-4 border-l-[3px] border-l-blue-500">
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="group/link flex items-start gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)] group-hover/link:text-blue-400 transition-colors leading-snug">
            {item.title}
          </span>
          <ExternalLink className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-0.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>

        {item.summary && (
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{item.summary}</p>
        )}

        {item.whyImportant && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/6 border border-blue-500/15">
            <p className="text-[11px] font-semibold text-blue-400 mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" /> 为什么重要
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.whyImportant}</p>
          </div>
        )}

        {item.affects?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.affects.map((a) => (
              <span key={a}
                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/8 text-blue-400 border border-blue-500/15 font-medium">
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-2.5 text-[11px] text-[var(--text-muted)]">{item.source}</div>
      </div>
    </div>
  );
}

// ── Simple news item ──────────────────────────────────────────────────────────

function SimpleItem({ item }: { item: DigestSimpleItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-start gap-2 p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] transition-all group">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
          {item.title}
        </p>
        {item.summary && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-1">{item.summary}</p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{item.source}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-[var(--text-muted)] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

// ── Model intel table ─────────────────────────────────────────────────────────

function ModelIntelTable({ items }: { items: DigestModelItem[] }) {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--card-border)]">
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
              <td className="px-4 py-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">{item.model}</td>
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
  );
}

// ── Paper item ────────────────────────────────────────────────────────────────

function PaperItem({ item }: { item: DigestPaperItem }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="block p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] transition-all group">
      <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-blue-400 transition-colors line-clamp-2">
        {item.title}
      </p>
      {item.summary && (
        <p className="text-xs text-[var(--text-secondary)] mt-1">{item.summary}</p>
      )}
      {item.impact && (
        <p className="text-xs text-amber-500 mt-1.5">行业影响：{item.impact}</p>
      )}
      <p className="text-[10px] text-[var(--text-muted)] mt-1">{item.source}</p>
    </a>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function DigestView() {
  const today = getBeijingToday();
  const allDates = last60Days();

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

  // Months collapsed by user. Current month + month containing selected date
  // are open by default; user toggling adds/removes other months from this set.
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());
  const currentMonth = today.slice(0, 7);
  const selectedMonth = selectedDate.slice(0, 7);
  const toggleMonth = (month: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  };
  const isMonthOpen = (month: string): boolean => {
    if (collapsedMonths.has(month)) return false;
    // Default: current month and the month containing the selected date are open
    if (month === currentMonth || month === selectedMonth) return true;
    // All other months default to collapsed
    return false;
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
      <div className="w-[220px] flex-shrink-0 flex flex-col border-r border-[var(--border-subtle)] overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-[var(--border-subtle)] shrink-0">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <CalendarDays className="w-4 h-4 text-blue-400" />
            AI 日报
          </h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">AI 行业每日情报</p>
        </div>

        <div className="flex-1 overflow-y-scroll">
          {groups.map(({ month, dates }) => {
            const open = isMonthOpen(month);
            const datesWithDigest = dates.filter(d => dateMap.has(d)).length;
            return (
              <div key={month}>
                {/* Month header — clickable to toggle collapse */}
                <button
                  onClick={() => toggleMonth(month)}
                  className="sticky top-0 z-10 w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider bg-[var(--bg-base)] border-b border-[var(--border-subtle)] hover:bg-[var(--card-bg)] transition-colors"
                >
                  {open
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />}
                  <span className="flex-1 text-left">{monthLabel(month)}</span>
                  {datesWithDigest > 0 && (
                    <span className="text-[10px] font-normal normal-case tracking-normal text-[var(--text-muted)]">
                      {datesWithDigest} 期
                    </span>
                  )}
                </button>

                {/* Date items — only render when month is open */}
                {open && dates.map((date) => {
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
                        ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                        : 'hover:bg-[var(--card-bg)]',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Day number */}
                      <span className={cn(
                        'text-sm font-mono font-bold shrink-0 w-8',
                        isSelected ? 'text-blue-400' : isToday ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                      )}>
                        {dayLabel(date)}
                      </span>

                      {/* Today badge */}
                      {isToday && (
                        <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold leading-none">
                          今
                        </span>
                      )}

                      {/* Has-data indicator */}
                      {!isToday && hasDigest && (
                        <div className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                      )}
                    </div>

                    {/* Summary preview */}
                    {hasDigest && summary ? (
                      <p className={cn(
                        'text-[11px] leading-snug mt-0.5 truncate',
                        isSelected ? 'text-blue-300/80' : 'text-[var(--text-muted)]',
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
      <div className="flex-1 overflow-y-scroll">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--card-border)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', generating && 'animate-spin')} />
              {generating ? '生成中...' : '重新生成'}
            </button>
          )}
        </div>

        <div className="px-6 py-6 space-y-8 max-w-3xl">
          {loading ? (
            <LoadingSkeleton />
          ) : !hasContent ? (
            <EmptyState
              date={selectedDate}
              today={today}
              onGenerate={handleGenerate}
              generating={generating}
            />
          ) : (
            <>
              {/* Summary banner */}
              {data!.summary && (
                <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/8 border border-blue-500/20">
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="text-[var(--text-muted)] text-xs mr-2">今日一句话</span>
                    {data!.summary}
                  </p>
                </div>
              )}

              {/* 今日重点 */}
              {data!.highlights?.length > 0 && (
                <Section icon="🔥" title="今日重点" count={data!.highlights.length}>
                  <div className="space-y-3">
                    {data!.highlights.map((h, i) => <HighlightCard key={i} item={h} />)}
                  </div>
                </Section>
              )}

              {/* 模型情报 */}
              {data!.modelIntel?.length > 0 && (
                <Section icon="🤖" title="模型情报" count={data!.modelIntel.length}>
                  <ModelIntelTable items={data!.modelIntel} />
                </Section>
              )}

              {/* 国内 + 国外 — side by side on wide screens */}
              {(data!.domestic?.length > 0 || data!.international?.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {data!.domestic?.length > 0 && (
                    <Section icon="🌍" title="国内动态" count={data!.domestic.length}>
                      <div className="space-y-2">
                        {data!.domestic.map((item, i) => <SimpleItem key={i} item={item} />)}
                      </div>
                    </Section>
                  )}
                  {data!.international?.length > 0 && (
                    <Section icon="🌎" title="国外动态" count={data!.international.length}>
                      <div className="space-y-2">
                        {data!.international.map((item, i) => <SimpleItem key={i} item={item} />)}
                      </div>
                    </Section>
                  )}
                </div>
              )}

              {/* AI 产品 */}
              {data!.products?.length > 0 && (
                <Section icon="🧩" title="AI 产品动态" count={data!.products.length}>
                  <div className="space-y-2">
                    {data!.products.map((item, i) => <SimpleItem key={i} item={item} />)}
                  </div>
                </Section>
              )}

              {/* 社区热议 */}
              {data!.community?.length > 0 && (
                <Section icon="👥" title="社区热议" count={data!.community.length}>
                  <div className="space-y-2">
                    {data!.community.map((item, i) => <SimpleItem key={i} item={item} />)}
                  </div>
                </Section>
              )}

              {/* 论文趋势 */}
              {data!.papers?.length > 0 && (
                <Section icon="📄" title="论文 & 技术趋势" count={data!.papers.length}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 rounded-xl bg-[var(--input-bg)] animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-36 rounded-xl bg-[var(--input-bg)] animate-pulse" />
      ))}
      <div className="h-24 rounded-xl bg-[var(--input-bg)] animate-pulse" />
    </div>
  );
}

function EmptyState({ date, today, onGenerate, generating }: {
  date: string; today: string; onGenerate: () => void; generating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <CalendarDays className="w-10 h-10 text-[var(--text-muted)] opacity-25" />
      <div>
        <p className="text-[var(--text-primary)] font-medium">
          {date === today ? '今日日报尚未生成' : `${date} 暂无日报`}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {date === today
            ? '每天北京时间 00:00 自动生成，也可手动触发'
            : '该日期暂无数据，可手动触发生成'}
        </p>
      </div>
      {date <= today && (
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
          {generating ? 'AI 正在分析资讯...' : '立即生成日报'}
        </button>
      )}
    </div>
  );
}
