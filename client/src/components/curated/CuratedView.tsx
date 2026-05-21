import { useState, useEffect, useRef } from 'react';
import { Star, ExternalLink, Clock, Tag, Search, X } from 'lucide-react';
import { curatedApi } from '../../services/api';
import { relativeTime } from '../../utils/relativeTime';
import { cn } from '../../lib/utils';
import { HotspotTabs } from '../hotspot/HotspotTabs';
import { BackToTop } from '../common/BackToTop';
import type { Hotspot, HotspotTab } from '../../types';

type Period = 'today' | 'week';

const SOURCE_LABEL: Record<string, string> = {
  rss_openai: 'OpenAI', rss_anthropic: 'Anthropic', rss_google_ai: 'Google AI',
  rss_deepmind: 'DeepMind', rss_hugging_face: 'Hugging Face', rss_mit_tech: 'MIT Tech Review',
  rss_the_decoder: 'The Decoder', rss_venturebeat: 'VentureBeat', rss_techcrunch: 'TechCrunch',
  rss_microsoft_ai: 'Microsoft AI', rss_synced: 'Synced', rss_github: 'GitHub Blog',
  rss_infoq: 'InfoQ', rss_hacker_news: 'Hacker News', rss_v2ex: 'V2EX', rss_juejin: '掘金',
  rss_cls: '财联社', rss_xueqiu: '雪球', rss_36kr: '36氪', rss_chinanews: '中国新闻网',
  rss_ithome: 'IT之家', rss_arxiv_ai: 'arXiv cs.AI', rss_arxiv_lg: 'arXiv cs.LG',
  rss_arxiv_cl: 'arXiv cs.CL', rss_arxiv_cv: 'arXiv cs.CV', rss_wheresyoured: "Where's Your Ed At",
  twitter: 'X', bing: 'Bing', bilibili: 'Bilibili', hackernews: 'HackerNews',
};

const IMPORTANCE_COLOR: Record<string, string> = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  medium: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

function getSourceLabel(source: string): string {
  if (SOURCE_LABEL[source]) return SOURCE_LABEL[source];
  if (source.startsWith('twitter_')) return '@' + source.slice(8);
  if (source.startsWith('rss_')) return source.slice(4).replace(/_/g, ' ');
  return source;
}

function CuratedCard({ item }: { item: Hotspot }) {
  const tags = item.tags ? (JSON.parse(item.tags) as string[]) : [];
  const importanceClass = IMPORTANCE_COLOR[item.importance] || IMPORTANCE_COLOR.low;

  return (
    <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(59,130,246,0.13)] transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--text-primary)] hover:text-blue-400 transition-colors leading-snug flex-1"
        >
          {item.title}
        </a>
        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {item.summary && (
        <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed line-clamp-2">
          {item.summary}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {tags.slice(0, 3).map((tag: string) => (
          <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border text-[var(--text-secondary)] border-[var(--border-subtle)]">
            <Tag className="w-2.5 h-2.5" />
            {tag}
          </span>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {item.importance !== 'low' && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full border', importanceClass)}>
              {item.importance === 'urgent' ? '紧急' : item.importance === 'high' ? '重要' : '关注'}
            </span>
          )}
          <span className="text-xs text-[var(--text-muted)]">{getSourceLabel(item.source)}</span>
          {item.qualityScore != null && (
            <span className="text-xs text-blue-400 font-mono">{Math.round(item.qualityScore)}分</span>
          )}
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock className="w-3 h-3" />
            {relativeTime(item.publishedAt || item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CuratedView() {
  const [period, setPeriod] = useState<Period>('today');
  const [activeTab, setActiveTab] = useState<HotspotTab>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [items, setItems] = useState<Hotspot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

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
      .then((res) => { setItems(res.items || []); setTotal(res.total || 0); })
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
          <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
            <Star className="w-5 h-5 text-blue-400" />
            精选资讯
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            AI 质量评分筛选，{total} 条精选内容
          </p>
        </div>
        <div className="flex gap-1 p-1 bg-[var(--bg-elevated)] rounded-lg">
          {(['today', 'week'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                period === p
                  ? 'bg-blue-500 text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              {p === 'today' ? '今日' : '本周'}
            </button>
          ))}
        </div>
      </div>

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
              className="w-full lg:w-44 pl-8 pr-7 py-1.5 rounded-lg text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/40"
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-all flex-shrink-0"
          >
            搜索
          </button>
        </div>
      </div>

      {appliedSearch && (
        <div className="mb-3 text-xs text-[var(--text-muted)]">
          搜索: <span className="text-blue-400">"{appliedSearch}"</span>
          <button onClick={handleClearSearch} className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            清除
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-[var(--bg-elevated)] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          {appliedSearch ? '没有匹配的精选内容' : '暂无精选内容，等待系统抓取...'}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => <CuratedCard key={item.id} item={item} />)}
        </div>
      )}

      <BackToTop />
    </div>
  );
}
