import { useState, useEffect, useRef } from 'react';
import { Star, ExternalLink, Clock, Search, X } from 'lucide-react';
import { curatedApi } from '../../services/api';
import { relativeTime } from '../../utils/relativeTime';
import { cn } from '../../lib/utils';
import { HotspotTabs } from '../hotspot/HotspotTabs';
import { BackToTop } from '../common/BackToTop';
import { SkeletonList } from '../common/Loader';
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

const CATEGORY_LABEL: Record<string, string> = {
  model: '模型发布', product: 'AI 产品', industry: '行业动态',
  research: '社区热门论文', community: '社区讨论', tips: '使用技巧',
};

function CuratedCard({ item }: { item: Hotspot }) {
  const tags = item.tags ? (JSON.parse(item.tags) as string[]) : [];

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-5 sm:p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Top meta row: source · category   |   quality score */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] min-w-0">
          <span className="truncate">{getSourceLabel(item.source)}</span>
          {item.category && CATEGORY_LABEL[item.category] && (
            <>
              <span className="opacity-60">（{CATEGORY_LABEL[item.category]}）</span>
            </>
          )}
        </div>
        {item.qualityScore != null && (
          <span className="shrink-0 text-xs font-mono px-2.5 py-0.5 rounded-full border border-[var(--accent-blue)]/30 text-[var(--accent-blue)] dark:text-blue-400">
            {Math.round(item.qualityScore)}
          </span>
        )}
      </div>

      {/* Title — large, semibold, reading-first */}
      <h3 className="text-[17px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] dark:group-hover:text-blue-400 transition-colors leading-snug mb-2.5">
        {item.title}
        <ExternalLink className="inline-block w-3.5 h-3.5 ml-1 mb-0.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="text-[14px] text-[var(--text-secondary)] mb-3.5 leading-[1.7] line-clamp-3">
          {item.summary}
        </p>
      )}

      {/* Tags — filled chips, like the reference */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {tags.slice(0, 4).map((tag: string) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: importance · time */}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text-muted)]">
        {item.importance !== 'low' && (
          <span className={cn('px-1.5 py-0.5 rounded-md border text-[10px]', IMPORTANCE_COLOR[item.importance])}>
            {item.importance === 'urgent' ? '紧急' : item.importance === 'high' ? '重要' : '关注'}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {relativeTime(item.publishedAt || item.createdAt)}
        </span>
      </div>
    </a>
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
        <div className="text-center py-16 rounded-3xl border border-dashed border-[var(--border-default)] text-[var(--text-muted)]">
          {appliedSearch ? '没有匹配的精选内容' : '暂无精选内容，等待系统抓取…'}
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
