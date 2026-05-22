import { useState, useEffect, useRef } from 'react';
import { Star, Search, X, Flame, Sparkles, Bookmark } from 'lucide-react';
import { curatedApi, hotspotsApi, keywordsApi, agentApi } from '../../services/api';
import { cn } from '../../lib/utils';
import { HotspotTabs } from '../hotspot/HotspotTabs';
import { HotspotCard } from '../hotspot/HotspotCard';
import { BackToTop } from '../common/BackToTop';
import { SkeletonList } from '../common/Loader';
import { EmptyState } from '../common/EmptyState';
import type { Hotspot, HotspotTab } from '../../types';

type Period = 'today' | 'week';


export function CuratedView() {
  const [period, setPeriod] = useState<Period>('today');
  const [activeTab, setActiveTab] = useState<HotspotTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState<Hotspot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{ today: number; curated: number; keywords: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // One-time fetch of overview metrics for the top stat strip.
  // The "curated" count comes from /api/agent/stats (a global, all-time
  // curated count) and never reacts to tab/period/search filters — those
  // change the list below but the stat tiles stay stable.
  useEffect(() => {
    Promise.all([
      hotspotsApi.getStats().catch(() => null),
      keywordsApi.getAll().catch(() => []),
      agentApi.getStats().catch(() => null),
    ]).then(([stats, kws, agentStats]) => {
      if (!stats) return;
      const activeKws = (kws as { isActive: boolean }[]).filter(k => k.isActive).length;
      setOverview({
        today: stats.today,
        curated: agentStats?.curated ?? 0,
        keywords: activeKws,
      });
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const opts: { category?: string; region?: string; search?: string } = {};
    // Tab → category or region filter
    if (activeTab === 'domestic' || activeTab === 'international') {
      opts.region = activeTab;
    } else if (activeTab !== 'all') {
      opts.category = activeTab;
    }
    if (appliedSearch) opts.search = appliedSearch;

    curatedApi.getAll(period, 50, 0, opts)
      .then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
      })
      .finally(() => setLoading(false));
  }, [period, activeTab, appliedSearch]);

  const handleSearch = () => setAppliedSearch(searchInput.trim());
  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    searchRef.current?.focus();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            <Star className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
            精选资讯
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            AI 质量评分筛选，{total} 条精选内容
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
          {(['today', 'week'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors',
                period === p
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm font-medium'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {p === 'today' ? '今日' : '本周'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats strip — at-a-glance overview, only on default tab/period */}
      {overview && (
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <StatTile
            icon={<Flame className="w-4 h-4" />}
            label="今日新增"
            value={overview.today}
            accent="text-red-500 dark:text-red-400 bg-red-500/10"
          />
          <StatTile
            icon={<Sparkles className="w-4 h-4" />}
            label="精选总数"
            value={overview.curated}
            accent="text-[var(--accent-blue)] dark:text-blue-400 bg-[var(--accent-blue)]/10 dark:bg-blue-500/10"
          />
          <StatTile
            icon={<Bookmark className="w-4 h-4" />}
            label="关注的关键词"
            value={overview.keywords}
            accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          />
        </div>
      )}

      {/* Tabs + Search row — stacked on mobile, side-by-side on lg+ */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <HotspotTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative flex-1 lg:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索标题/摘要"
              className="w-full lg:w-44 pl-8 pr-7 py-1.5 rounded-xl text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)]"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--card-bg)] border border-[var(--input-border)] text-[var(--text-primary)] hover:border-[var(--accent-blue)]/50 hover:bg-[var(--card-bg-hover)] transition-all flex-shrink-0"
          >
            搜索
          </button>
        </div>
      </div>

      {appliedSearch && (
        <div className="mb-3 text-xs text-[var(--text-muted)]">
          搜索: <span className="text-[var(--accent-blue)] dark:text-blue-400">"{appliedSearch}"</span>
          <button onClick={handleClearSearch} className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            清除
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList count={5} itemClassName="h-28 rounded-3xl" />
      ) : items.length === 0 ? (
        <EmptyState
          variant={appliedSearch ? 'search' : 'star'}
          title={appliedSearch ? '没有匹配的精选内容' : '暂无精选内容'}
          description={appliedSearch ? `换个词试试，或者清空搜索看全部精选` : '系统正在抓取并评分最新资讯，稍后回来看看'}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <HotspotCard key={item.id} hotspot={item} index={index} />
          ))}
        </div>
      )}

      <BackToTop />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)]">
      <span className={cn('flex items-center justify-center w-9 h-9 rounded-xl shrink-0', accent)}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[19px] sm:text-[22px] font-bold text-[var(--text-primary)] leading-tight tabular-nums">
          {value}
        </div>
        <div className="text-[11px] text-[var(--text-muted)] truncate">{label}</div>
      </div>
    </div>
  );
}
