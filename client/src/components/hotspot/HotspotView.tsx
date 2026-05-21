import { useState, useCallback, useEffect, useRef } from 'react';
import { Radio, RefreshCw, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { hotspotsApi, triggerHotspotCheck, getScanStatus, keywordsApi } from '../../services/api';
import { onNewHotspot, onNotification, onScanStatus, onScanProgress, subscribeToKeywords } from '../../services/socket';
import FilterSortBar, { defaultFilterState, type FilterState } from '../FilterSortBar';
import { HotspotCard } from './HotspotCard';
import { HotspotTabs } from './HotspotTabs';
import { BackToTop } from '../common/BackToTop';
import { cn } from '../../lib/utils';
import type { Hotspot, HotspotTab } from '../../types';
import type { Keyword } from '../../services/api';

export function HotspotView() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [stats, setStats] = useState<{ total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [filters, setFilters] = useState<FilterState>({ ...defaultFilterState });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<HotspotTab>('all');

  // expand/collapse state — each card decides for itself; no "expand all" toggle.
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());

  // Search
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams: Record<string, string | number> = {
        limit: 20,
        page: currentPage,
      };
      if (filters.source) filterParams.source = filters.source;
      if (filters.importance) filterParams.importance = filters.importance;
      if (filters.keywordId) filterParams.keywordId = filters.keywordId;
      if (filters.timeRange) filterParams.timeRange = filters.timeRange;
      if (filters.isReal) filterParams.isReal = filters.isReal;
      if (filters.sortBy) filterParams.sortBy = filters.sortBy;
      if (filters.sortOrder) filterParams.sortOrder = filters.sortOrder;
      if (appliedSearch) filterParams.search = appliedSearch;

      // Tab-based filtering
      if (activeTab === 'domestic' || activeTab === 'international') {
        filterParams.region = activeTab;
      } else if (activeTab !== 'all') {
        filterParams.category = activeTab;
      }

      const [hotspotsData, statsData, keywordsData] = await Promise.all([
        hotspotsApi.getAll(filterParams as Parameters<typeof hotspotsApi.getAll>[0]),
        hotspotsApi.getStats(),
        keywordsApi.getAll(),
      ]);
      setHotspots(hotspotsData.data as unknown as Hotspot[]);
      setTotalPages(hotspotsData.pagination.totalPages);
      // Show count for the current tab/filter, not global total
      setStats({ total: hotspotsData.pagination.total });
      void statsData; // global stats kept for potential future use
      setKeywords(keywordsData as unknown as Keyword[]);

      const activeKeywords = (keywordsData as unknown as Keyword[]).filter(k => k.isActive).map(k => k.text);
      if (activeKeywords.length > 0) subscribeToKeywords(activeKeywords);
    } catch (err) {
      console.error('Failed to load hotspots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, activeTab, appliedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab, appliedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket
  useEffect(() => {
    const unsubHotspot = onNewHotspot((hotspot) => {
      setHotspots(prev => [hotspot as unknown as Hotspot, ...prev.slice(0, 19)]);
    });
    const unsubNotif = onNotification(() => {});
    const unsubScan = onScanStatus((status) => {
      setIsChecking(status.isScanning);
      if (!status.isScanning) {
        setScanProgress('');
        setLastCheckTime(new Date());
        loadData();
      }
    });
    const unsubProgress = onScanProgress((p) => {
      // Translate raw pipeline phases into reader-friendly status text.
      // Avoid leaking internal counters like "0/N" into the UI.
      switch (p.phase) {
        case 'sources_start':
          setScanProgress('正在收集最新资讯…');
          break;
        case 'sources_done':
          setScanProgress('正在分析内容质量…');
          break;
        case 'keywords_skipped':
          setScanProgress('整理结果…');
          break;
        case 'keywords_start':
          setScanProgress('为你筛选相关热点…');
          break;
        case 'keyword_done':
          setScanProgress('为你筛选相关热点…');
          break;
        case 'keywords_done':
          setScanProgress('即将完成…');
          break;
      }
    });
    return () => { unsubHotspot(); unsubNotif(); unsubScan(); unsubProgress(); };
  }, [loadData]);

  // Initial scan status (in case a scan is already running when we mount)
  useEffect(() => {
    getScanStatus().then(s => {
      setIsChecking(s.isScanning);
      if (s.lastScanFinishedAt) setLastCheckTime(new Date(s.lastScanFinishedAt));
    }).catch(() => {});
  }, []);

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    searchRef.current?.focus();
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await triggerHotspotCheck();
      // Scan now runs in the background; UI will update via onScanStatus.
    } catch {
      setIsChecking(false);
    }
  };

  const toggleReason = (id: string) => {
    setExpandedReasons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleContent = (id: string) => {
    setExpandedContents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          <Radio className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
          热点雷达
        </h1>
        <div className="flex items-center gap-3">
          {lastCheckTime && !isChecking && (
            <span className="text-xs text-[var(--text-muted)]">
              上次 {lastCheckTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-opacity',
              isChecking
                ? 'bg-[var(--accent-blue)]/60 text-white cursor-wait'
                : 'bg-[var(--accent-blue)] text-white hover:opacity-90 shadow-sm',
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isChecking && 'animate-spin')} />
            {isChecking ? (scanProgress || '正在扫描…') : '立即扫描'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <p className="text-xs text-[var(--text-muted)] mb-4">共 {stats.total} 条热点</p>
      )}

      {/* Tabs + Search row — stacked on mobile, side-by-side on lg+ */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <HotspotTabs activeTab={activeTab} onChange={(tab) => setActiveTab(tab)} />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative flex-1 lg:flex-initial">
            <input
              ref={searchRef}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索标题/摘要…"
              className="w-full lg:w-44 pl-3 pr-7 py-1.5 rounded-xl text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--border-active)] transition-all"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm bg-[var(--card-bg)] border border-[var(--input-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all flex-shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            搜索
          </button>
        </div>
      </div>

      {/* Applied search hint */}
      {appliedSearch && (
        <div className="flex items-center gap-2 mb-3 text-xs text-[var(--text-secondary)]">
          <span>搜索：<span className="text-[var(--accent-blue)] dark:text-blue-400 font-medium">"{appliedSearch}"</span></span>
          <button onClick={handleClearSearch} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors underline">
            清空
          </button>
        </div>
      )}

      {/* Filter & Sort Bar */}
      <div className="mb-5">
        <FilterSortBar filters={filters} onChange={setFilters} keywords={keywords} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[var(--accent-blue)]/30 border-t-[var(--accent-blue)] dark:border-blue-500/30 dark:border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : hotspots.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--card-bg)]/40">
          <p className="text-[var(--text-secondary)]">尚未发现热点</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">添加监控关键词开始追踪</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotspots.map((hotspot, index) => (
            <HotspotCard
              key={hotspot.id}
              hotspot={hotspot}
              index={index}
              expandedReasons={expandedReasons}
              expandedContents={expandedContents}
              onToggleReason={toggleReason}
              onToggleContent={toggleContent}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) {
                page = i + 1;
              } else if (currentPage <= 4) {
                page = i + 1;
              } else if (currentPage >= totalPages - 3) {
                page = totalPages - 6 + i;
              } else {
                page = currentPage - 3 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                    currentPage === page
                      ? 'bg-[var(--tab-active-bg)] text-[var(--tab-active-text)] border border-[var(--tab-active-border)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)]',
                  )}
                >
                  {page}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-2 rounded-xl bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--card-border-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-[var(--text-muted)] ml-2">共 {stats?.total || 0} 条</span>
        </div>
      )}

      <BackToTop />
    </div>
  );
}
