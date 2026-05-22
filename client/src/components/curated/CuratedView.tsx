import { useState, useEffect, useRef } from 'react';
import {
  Star, ExternalLink, Clock, Search, X, Flame, Sparkles, Bookmark,
  ThermometerSun, Zap, Repeat2, MessageCircle, Eye,
} from 'lucide-react';
import { curatedApi, hotspotsApi, keywordsApi, agentApi } from '../../services/api';
import { relativeTime } from '../../utils/relativeTime';
import { cn } from '../../lib/utils';
import { HotspotTabs } from '../hotspot/HotspotTabs';
import { BackToTop } from '../common/BackToTop';
import { SkeletonList } from '../common/Loader';
import { EmptyState } from '../common/EmptyState';
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
  rss_nvidia: 'NVIDIA', rss_meta_ai: 'Meta AI', rss_hf_papers: 'HuggingFace Daily Papers',
  twitter: 'X', bing: 'Bing', bilibili: 'Bilibili', hackernews: 'HackerNews',
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

  // Aggregate engagement metric — same heat formula as HotspotCard
  const heatRaw =
    (item.likeCount ?? 0) * 2 +
    (item.retweetCount ?? 0) * 3 +
    (item.replyCount ?? 0) * 1.5 +
    (item.commentCount ?? 0) * 1.5 +
    (item.viewCount ?? 0) / 100;
  const heatScore = heatRaw > 0 ? Math.min(100, Math.round(Math.log10(heatRaw + 1) * 25)) : 0;
  const heat =
    heatScore >= 80 ? { label: '爆', color: 'text-red-500 dark:text-red-400' } :
    heatScore >= 60 ? { label: '热', color: 'text-orange-500 dark:text-orange-400' } :
    heatScore >= 40 ? { label: '温', color: 'text-amber-500 dark:text-amber-400' } :
    heatScore >= 20 ? { label: '凉', color: 'text-[var(--accent-blue)] dark:text-blue-400' } :
                       null;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-5 sm:p-6 rounded-3xl border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--card-border-hover)] hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Top meta row: importance · source · category · keyword */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {item.importance !== 'low' && (
          <span className={cn('text-[10px] px-2 py-0.5 rounded-md border font-semibold uppercase tracking-wider flex items-center gap-1',
            item.importance === 'urgent' && 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/25',
            item.importance === 'high' && 'bg-orange-500/15 text-orange-500 dark:text-orange-400 border-orange-500/25',
            item.importance === 'medium' && 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/25',
          )}>
            {item.importance === 'urgent' ? '紧急' : item.importance === 'high' ? '重要' : '关注'}
          </span>
        )}
        <span className="text-xs text-[var(--text-muted)]">{getSourceLabel(item.source)}</span>
        {item.category && CATEGORY_LABEL[item.category] && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            {CATEGORY_LABEL[item.category]}
          </span>
        )}
        {item.keyword && (
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border border-[var(--accent-blue)]/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
            {item.keyword.text}
          </span>
        )}
        {heat && (
          <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-[var(--input-bg)] border border-[var(--input-border)] font-medium', heat.color)}>
            <ThermometerSun className="w-3 h-3" />
            {heat.label} {heatScore}
          </span>
        )}
        {item.qualityScore != null && (
          <span className="ml-auto text-xs font-mono px-2.5 py-0.5 rounded-full border border-[var(--accent-blue)]/30 text-[var(--accent-blue)] dark:text-blue-400 shrink-0">
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
        <p className="text-[14px] text-[var(--text-secondary)] mb-3 leading-[1.7] line-clamp-3">
          {item.summary}
        </p>
      )}

      {/* Tags — filled chips */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
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

      {/* Engagement metrics + time */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
        {item.likeCount != null && item.likeCount > 0 && (
          <span className="flex items-center gap-1" title="点赞">
            <Zap className="w-3 h-3" />
            {item.likeCount.toLocaleString()}
          </span>
        )}
        {item.retweetCount != null && item.retweetCount > 0 && (
          <span className="flex items-center gap-1" title="转发">
            <Repeat2 className="w-3 h-3" />
            {item.retweetCount.toLocaleString()}
          </span>
        )}
        {item.commentCount != null && item.commentCount > 0 && (
          <span className="flex items-center gap-1" title="评论">
            <MessageCircle className="w-3 h-3" />
            {item.commentCount.toLocaleString()}
          </span>
        )}
        {item.viewCount != null && item.viewCount > 0 && (
          <span className="flex items-center gap-1" title="浏览">
            <Eye className="w-3 h-3" />
            {item.viewCount.toLocaleString()}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
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
          {items.map(item => <CuratedCard key={item.id} item={item} />)}
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
