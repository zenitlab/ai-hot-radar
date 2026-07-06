import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Bookmark, Brain, ExternalLink, Clock, X, ChevronLeft } from 'lucide-react';
import { keywordsApi, entitiesApi } from '../../services/api';
import { subscribeToKeywords } from '../../services/socket';
import { relativeTime } from '../../utils/relativeTime';
import { cn } from '../../lib/utils';
import { EntityCard } from './EntityCard';
import { EntityRelationGraph } from './EntityRelationGraph';
import { TrendChart } from './TrendChart';
import { Skeleton, SkeletonList } from '../common/Loader';
import { EmptyState } from '../common/EmptyState';
import type { EntityCardSummary, EntityCardDetail, NewsItem, RelatedData } from '../../services/api';

interface KeywordsViewProps {
  onToast?: (msg: string, type: 'success' | 'error') => void;
}

export function KeywordsView({ onToast }: KeywordsViewProps) {
  const [entities, setEntities] = useState<EntityCardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityCardDetail | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      const data = await entitiesApi.getAll();
      setEntities(data);
      const activeNames = data.filter((e) => e.keyword.isActive).map((e) => e.keyword.text);
      if (activeNames.length > 0) subscribeToKeywords(activeNames);
    } catch (err) {
      console.error('Failed to load entities:', err);
    }
  }, []);  const startPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollRef.current = setInterval(async () => {
      const data = await entitiesApi.getAll().catch(() => null);
      if (!data) return;
      setEntities(data);
      const stillLoading = data.some((e) => !e.relatedData);
      if (!stillLoading) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 4000);
  }, []);

  useEffect(() => {
    loadEntities();
    startPolling();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [loadEntities, startPolling]);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const d = await entitiesApi.getOne(id);
      setDetail(d);
    } catch {}
    finally { setLoadingDetail(false); }
  }, []);

  // Auto-select the first entity once on mount (desktop only). Mobile keeps the
  // list-only view by default. Use a ref so toggling selectedId back to null
  // (e.g. user clicking "返回" on mobile) won't re-trigger auto-select and flicker.
  const didAutoSelectRef = useRef(false);
  useEffect(() => {
    if (didAutoSelectRef.current) return;
    if (entities.length === 0) return;
    didAutoSelectRef.current = true;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      const firstId = entities[0].id;
      setSelectedId(firstId);
      loadDetail(firstId);
    }
  }, [entities, loadDetail]);

  const handleSelectCard = (entity: EntityCardSummary) => {
    if (selectedId === entity.id) {
      setSelectedId(null);
      setDetail(null);
    } else {
      setSelectedId(entity.id);
      loadDetail(entity.id);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    setIsAdding(true);
    try {
      await keywordsApi.create({ text: newKeyword.trim() });
      setNewKeyword('');
      onToast?.('关键词添加成功，正在生成知识卡片...', 'success');
      await loadEntities();
      startPolling();
    } catch (err: any) {
      onToast?.(err.message ?? '添加失败', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRefresh = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRefreshingId(id);
    try {
      await entitiesApi.refresh(id);
      onToast?.('刷新成功', 'success');
      await loadEntities();
      if (selectedId === id) loadDetail(id);
    } catch {
      onToast?.('刷新失败', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, keywordId: string, entityId: string) => {
    e.stopPropagation();
    try {
      await keywordsApi.delete(keywordId);
      setEntities((prev) => prev.filter((en) => en.id !== entityId));
      if (selectedId === entityId) { setSelectedId(null); setDetail(null); }
      onToast?.('已删除', 'success');
    } catch {
      onToast?.('删除失败', 'error');
    }
  };

  const selectedEntity = entities.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: cards ───────────────────────────────────
          Desktop: always visible at fixed width.
          Mobile: full-width when no entity selected; hidden once one is. */}
      <div
        className={cn(
          'flex-col border-r border-[var(--border-subtle)] overflow-hidden',
          'lg:flex lg:w-[320px] lg:flex-shrink-0',
          selectedEntity ? 'hidden lg:flex' : 'flex w-full',
        )}
      >
        {/* Header + add form */}
        <div className="p-4 border-b border-[var(--border-subtle)] shrink-0">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
            <Bookmark className="w-5 h-5 text-[var(--accent-blue)] dark:text-blue-400" />
            我的关注
          </h1>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="添加关键词，如 Claude..."
              disabled={isAdding}
              className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={isAdding || !newKeyword.trim()}
              className="px-3 py-2 rounded-xl bg-[var(--accent-blue)]/85 text-white text-sm font-medium flex items-center gap-1 hover:bg-[var(--accent-blue)] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Entity cards list */}
        <div className="flex-1 overflow-y-scroll p-3 space-y-2.5">
          {entities.length === 0 ? (
            <EmptyState
              variant="bookmark"
              title="添加你关注的实体"
              description="输入 Claude、OpenAI、Cursor 等关键词，AI 会自动抓取相关动态"
            />
          ) : (
            entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={selectedId === entity.id}
                isRefreshing={refreshingId === entity.id}
                onClick={() => handleSelectCard(entity)}
                onRefresh={(e) => handleRefresh(e, entity.id)}
                onDelete={(e) => handleDelete(e, entity.keyword.id, entity.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: detail ─────────────────────────────────
          Desktop: always visible.
          Mobile: shown only when an entity is selected; back button returns to list. */}
      <div
        className={cn(
          'flex-1 min-w-0 overflow-y-scroll',
          'lg:block lg:p-5',
          selectedEntity ? 'block' : 'hidden lg:block',
        )}
      >
        {selectedEntity && (
          <div className="lg:hidden sticky top-0 z-10 flex items-center gap-3 px-3 py-2.5 bg-[var(--bg-base)]/95 backdrop-blur border-b border-[var(--border-subtle)]">
            <button
              onClick={() => { setSelectedId(null); setDetail(null); }}
              aria-label="返回关键词列表"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[var(--accent-blue)] dark:text-blue-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {selectedEntity.keyword.text}
              </span>
            </div>
          </div>
        )}
        <div className="p-4 lg:p-0">
          {!selectedEntity ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-sm gap-2 py-20">
              <Brain className="w-10 h-10 opacity-20" />
              <p>点击左侧卡片查看实体详情</p>
            </div>
          ) : loadingDetail ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-72" />
              <Skeleton className="h-4 w-32" />
              <SkeletonList count={3} itemClassName="h-8" />
            </div>
          ) : detail ? (
            <DetailPanel entity={selectedEntity} detail={detail} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ entity, detail }: { entity: EntityCardSummary; detail: EntityCardDetail }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeNews, setNodeNews] = useState<NewsItem[] | null>(null);
  const [loadingNodeNews, setLoadingNodeNews] = useState(false);

  const relData: RelatedData | null = (() => {
    try { return detail.relatedData ? JSON.parse(detail.relatedData) : null; } catch { return null; }
  })();

  const totalMentions = detail.trend.reduce((s, t) => s + t.count, 0);

  const handleNodeClick = useCallback(async (name: string | null) => {
    setSelectedNode(name);
    setNodeNews(null);
    if (!name) return;
    setLoadingNodeNews(true);
    try {
      const news = await entitiesApi.getNewsForName(name, 6);
      setNodeNews(news);
    } catch {
      setNodeNews([]);
    } finally {
      setLoadingNodeNews(false);
    }
  }, []);

  // Reset node selection when entity changes
  useEffect(() => {
    setSelectedNode(null);
    setNodeNews(null);
  }, [entity.id]);

  const displayNews = selectedNode ? (nodeNews ?? []) : detail.latestNews;
  const newsTitle = selectedNode ? `与「${selectedNode}」相关资讯` : '最新相关资讯';

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">{entity.name}</h2>
        {entity.summary && (
          <p className="text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">{entity.summary}</p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="今日提及" value={entity.todayMentions} />
        <StatCard label="7日提及" value={totalMentions} />
        <StatCard label="关联产品" value={relData?.relatedProducts?.length ?? 0} />
      </div>

      {/* Relation graph */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">关系图谱</h3>
        <div className="h-72 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden">
          <EntityRelationGraph
            entityName={entity.name}
            relatedData={relData}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
          />
        </div>
        {selectedNode && (
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5 text-center">
            已选中节点：<span className="text-[var(--accent-blue)] dark:text-blue-400 font-medium">{selectedNode}</span>
            <button
              onClick={() => handleNodeClick(null)}
              className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-3 h-3 inline" /> 取消
            </button>
          </p>
        )}
      </div>

      {/* Trend chart */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">热度趋势（近7天）</h3>
        <div className="h-44 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-2">
          <TrendChart data={detail.trend} name={entity.name} />
        </div>
      </div>

      {/* Related info */}
      {relData && (
        <div className="grid grid-cols-2 gap-3">
          {relData.relatedProducts?.length > 0 && (
            <RelatedSection title="集成产品" items={relData.relatedProducts} color="amber" onTagClick={handleNodeClick} />
          )}
          {relData.relatedCompanies?.length > 0 && (
            <RelatedSection title="相关公司" items={relData.relatedCompanies} color="emerald" onTagClick={handleNodeClick} />
          )}
          {relData.relatedModels?.length > 0 && (
            <RelatedSection title="关联模型" items={relData.relatedModels} color="blue" onTagClick={handleNodeClick} />
          )}
          {relData.competesWith?.length > 0 && (
            <RelatedSection title="竞争关系" items={relData.competesWith} color="red" onTagClick={handleNodeClick} />
          )}
        </div>
      )}

      {/* News section */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{newsTitle}</h3>
        {loadingNodeNews ? (
          <SkeletonList count={3} itemClassName="h-24" />
        ) : displayNews.length > 0 ? (
          <div className="space-y-2.5">
            {displayNews.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] hover:-translate-y-0.5 transition-all group"
              >
                {/* Source + importance + quality on top */}
                <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] mb-1.5">
                  <span className="font-medium">{n.source}</span>
                  {n.importance && n.importance !== 'low' && (
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      n.importance === 'urgent' && 'bg-red-500/15 text-red-500 dark:text-red-400',
                      n.importance === 'high' && 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
                      n.importance === 'medium' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                    )}>
                      {n.importance === 'urgent' ? '紧急' : n.importance === 'high' ? '重要' : '关注'}
                    </span>
                  )}
                  {n.qualityScore != null && (
                    <span className="font-mono">{Math.round(n.qualityScore)}分</span>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {relativeTime(n.publishedAt || n.createdAt)}
                  </span>
                </div>

                {/* Title */}
                <p className="text-[14px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug mb-1.5">
                  {n.title}
                  <ExternalLink className="inline-block w-3 h-3 ml-1 mb-0.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>

                {/* Summary */}
                {n.summary && (
                  <p className="text-[12.5px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {n.summary}
                  </p>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm">
            {selectedNode ? `暂无与「${selectedNode}」相关的资讯` : '暂无相关资讯，继续抓取中...'}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-center">
      <div className="text-lg font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{label}</div>
    </div>
  );
}

const COLOR_CLASSES: Record<string, string> = {
  amber:   'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  red:     'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
};

function RelatedSection({
  title,
  items,
  color,
  onTagClick,
}: {
  title: string;
  items: string[];
  color: string;
  onTagClick: (name: string) => void;
}) {
  return (
    <div className="p-3 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
      <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onTagClick(item)}
            className={cn(
              'text-[11px] px-2 py-0.5 rounded-full border font-medium transition-colors cursor-pointer',
              COLOR_CLASSES[color] ?? COLOR_CLASSES.blue,
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
