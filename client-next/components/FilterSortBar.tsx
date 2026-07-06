'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown, Filter, X, Clock, Flame, TrendingUp, Target,
  ChevronDown, ChevronRight, Check, RotateCcw
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Keyword } from '../services/api';

export interface FilterState {
  source: string;
  importance: string;
  keywordId: string;
  timeRange: string;
  isReal: string;
  sortBy: string;
  sortOrder: string;
}

export const defaultFilterState: FilterState = {
  source: '',
  importance: '',
  keywordId: '',
  timeRange: '',
  isReal: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

interface FilterSortBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  keywords: Keyword[];
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: '最新发现', icon: Clock },
  { value: 'publishedAt', label: '最新发布', icon: Clock },
  { value: 'importance', label: '重要程度', icon: Flame },
  { value: 'relevance', label: '相关性', icon: Target },
  { value: 'hot', label: '热度综合', icon: TrendingUp },
];

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  // Search sources
  { value: 'twitter', label: 'X (搜索)' },
  { value: 'bing', label: 'Bing' },
  { value: 'hackernews', label: 'HackerNews' },
  { value: 'bilibili', label: 'Bilibili' },
  // Official AI labs (T1)
  { value: 'rss_openai', label: 'OpenAI Blog' },
  { value: 'rss_anthropic', label: 'Anthropic' },
  { value: 'rss_google_ai', label: 'Google AI Blog' },
  { value: 'rss_deepmind', label: 'Google DeepMind' },
  { value: 'rss_hugging_face', label: 'Hugging Face' },
  { value: 'rss_microsoft_ai', label: 'Microsoft AI' },
  { value: 'rss_mit_tech', label: 'MIT Tech Review' },
  // Research / arXiv
  { value: 'rss_arxiv_ai', label: 'arXiv cs.AI' },
  { value: 'rss_arxiv_lg', label: 'arXiv cs.LG' },
  { value: 'rss_arxiv_cl', label: 'arXiv cs.CL' },
  { value: 'rss_arxiv_cv', label: 'arXiv cs.CV' },
  // Quality media (T1.5)
  { value: 'rss_the_decoder', label: 'The Decoder' },
  { value: 'rss_venturebeat', label: 'VentureBeat' },
  { value: 'rss_techcrunch', label: 'TechCrunch' },
  { value: 'rss_synced', label: 'Synced' },
  { value: 'rss_github', label: 'GitHub Blog' },
  { value: 'rss_wheresyoured', label: "Where's Your Ed At" },
  // Chinese sources
  { value: 'rss_ithome', label: 'IT之家' },
  { value: 'rss_36kr', label: '36氪' },
  { value: 'rss_cls', label: '财联社' },
  { value: 'rss_xueqiu', label: '雪球' },
  { value: 'rss_chinanews', label: '中国新闻网' },
  { value: 'rss_infoq', label: 'InfoQ' },
  // Community
  { value: 'rss_hacker_news', label: 'HN Best' },
  { value: 'rss_v2ex', label: 'V2EX' },
  { value: 'rss_juejin', label: '掘金' },
];

const IMPORTANCE_OPTIONS = [
  { value: '', label: '全部等级' },
  { value: 'urgent', label: '🔴 紧急', color: 'text-red-400' },
  { value: 'high', label: '🟠 高', color: 'text-orange-400' },
  { value: 'medium', label: '🟡 中', color: 'text-amber-400' },
  { value: 'low', label: '🟢 低', color: 'text-emerald-400' },
];

const TIME_RANGE_OPTIONS = [
  { value: '', label: '全部时间' },
  { value: '1h', label: '最近 1 小时' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

const REAL_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'true', label: '✅ 真实' },
  { value: 'false', label: '⚠️ 疑似虚假' },
];

// Dropdown component
function Dropdown({ 
  label, 
  value, 
  options, 
  onChange 
}: { 
  label: string; 
  value: string; 
  options: { value: string; label: string; color?: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const isActive = value !== '';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
          isActive
            ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border border-[var(--tab-active-border)]"
            : "bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--input-border)] hover:border-[var(--card-border-hover)] hover:text-[var(--text-primary)]"
        )}
      >
        <span>{isActive ? selected?.label : label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1 z-50 min-w-[180px] max-h-[320px] overflow-y-auto bg-[var(--dropdown-bg)] backdrop-blur-xl rounded-xl border border-[var(--card-border-hover)] shadow-2xl"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left",
                    value === option.value
                      ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--dropdown-item-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {value === option.value && <Check className="w-3 h-3 shrink-0" />}
                  <span className={cn(option.color)}>{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FilterSortBar({ filters, onChange, keywords }: FilterSortBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const sortScrollRef = useRef<HTMLDivElement>(null);
  const [sortCanScrollRight, setSortCanScrollRight] = useState(false);

  // Detect if the sort strip overflows on the right (so we can show a chevron hint).
  useEffect(() => {
    const el = sortScrollRef.current;
    if (!el) return;
    const update = () => {
      setSortCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const handleSortScrollRight = () => {
    sortScrollRef.current?.scrollBy({ left: 120, behavior: 'smooth' });
  };

  const activeFilterCount = [
    filters.source,
    filters.importance,
    filters.keywordId,
    filters.timeRange,
    filters.isReal,
  ].filter(v => v !== '').length;

  const hasNonDefaultSort = filters.sortBy !== 'createdAt';

  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onChange({ ...defaultFilterState });
  };

  const keywordOptions = [
    { value: '', label: '全部关键词' },
    ...keywords.filter(k => k.isActive).map(k => ({ value: k.id, label: k.text })),
  ];

  return (
    <div className="space-y-3">
      {/* Main Bar: Sort + Filter Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort Selector — horizontally scrollable on mobile when overflow */}
        <div className="relative flex-1 lg:flex-none min-w-0">
          <div
            ref={sortScrollRef}
            className="flex items-center gap-1 bg-[var(--sort-bar-bg)] rounded-xl border border-[var(--sort-bar-border)] p-1 overflow-x-auto scrollbar-hide touch-pan-x pr-7"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 ml-2 flex-shrink-0" />
            {SORT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => update('sortBy', opt.value)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
                    filters.sortBy === opt.value
                      ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border border-[var(--tab-active-border)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              );
            })}
          </div>
          {/* Right-edge fade + chevron hint when there are more sort options to scroll to */}
          {sortCanScrollRight && (
            <>
              <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-10 rounded-r-xl bg-gradient-to-l from-[var(--sort-bar-bg)] via-[var(--sort-bar-bg)]/85 to-transparent" />
              <button
                onClick={handleSortScrollRight}
                aria-label="向右滚动查看更多排序"
                className="absolute top-1/2 -translate-y-1/2 right-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--card-bg)] border border-[var(--card-border-hover)] text-[var(--text-secondary)] hover:text-[var(--accent-blue)] dark:hover:text-blue-400 shadow-sm transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all",
            showFilters || activeFilterCount > 0
              ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border border-[var(--tab-active-border)]"
              : "bg-[var(--input-bg)] text-[var(--text-secondary)] border border-[var(--input-border)] hover:border-[var(--card-border-hover)]"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          筛选
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[var(--accent-blue)] dark:bg-blue-500 text-[10px] text-white flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Reset */}
        {(activeFilterCount > 0 || hasNonDefaultSort) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        )}

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.source && (
              <FilterTag
                label={SOURCE_OPTIONS.find(o => o.value === filters.source)?.label || filters.source}
                onRemove={() => update('source', '')}
              />
            )}
            {filters.importance && (
              <FilterTag
                label={IMPORTANCE_OPTIONS.find(o => o.value === filters.importance)?.label || filters.importance}
                onRemove={() => update('importance', '')}
              />
            )}
            {filters.keywordId && (
              <FilterTag
                label={keywords.find(k => k.id === filters.keywordId)?.text || '关键词'}
                onRemove={() => update('keywordId', '')}
              />
            )}
            {filters.timeRange && (
              <FilterTag
                label={TIME_RANGE_OPTIONS.find(o => o.value === filters.timeRange)?.label || filters.timeRange}
                onRemove={() => update('timeRange', '')}
              />
            )}
            {filters.isReal && (
              <FilterTag
                label={REAL_OPTIONS.find(o => o.value === filters.isReal)?.label || '真实性'}
                onRemove={() => update('isReal', '')}
              />
            )}
          </div>
        )}
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
              <Dropdown label="来源" value={filters.source} options={SOURCE_OPTIONS} onChange={(v) => update('source', v)} />
              <Dropdown label="重要程度" value={filters.importance} options={IMPORTANCE_OPTIONS} onChange={(v) => update('importance', v)} />
              <Dropdown label="关键词" value={filters.keywordId} options={keywordOptions} onChange={(v) => update('keywordId', v)} />
              <Dropdown label="时间" value={filters.timeRange} options={TIME_RANGE_OPTIONS} onChange={(v) => update('timeRange', v)} />
              <Dropdown label="真实性" value={filters.isReal} options={REAL_OPTIONS} onChange={(v) => update('isReal', v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-medium border border-[var(--accent-blue)]/20 dark:border-blue-500/20">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}
