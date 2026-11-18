'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useIsAdmin } from '@/lib/admin';
import Link from 'next/link';
import { Plus, X, ChevronLeft } from 'lucide-react';
import { keywordsApi, entitiesApi } from '../../services/api';
import { subscribeToKeywords } from '../../services/socket';
import { relativeTime } from '../../utils/relativeTime';
import { cn } from '../../lib/utils';
import { EntityCard, ENTITY_TYPE_LABEL } from './EntityCard';
import { EntityRelationGraph } from './EntityRelationGraph';
import { TrendChart } from './TrendChart';
import { Skeleton, SkeletonList } from '../common/Loader';
import { ItemTitle } from '../common/ItemTitle';
import { AdminSignIn } from '../common/AdminSignIn';
import type { EntityCardSummary, EntityCardDetail, NewsItem, RelatedData } from '../../services/api';
import { SourceTag } from '@/components/common/SourceTag';

interface KeywordsViewProps {
  onToast?: (msg: string, type: 'success' | 'error') => void;
}

export function KeywordsView({ onToast }: KeywordsViewProps) {
  const [entities, setEntities] = useState<EntityCardSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EntityCardDetail | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const isAdmin = useIsAdmin();
  const [isAdding, setIsAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadEntities = useCallback(async () => {
    try {
      const data = await entitiesApi.getAll();
      setEntities(data);
      const activeNames = data.reduce<string[]>((acc, e) => { if (e.keyword.isActive) acc.push(e.keyword.text); return acc; }, []);
      if (activeNames.length > 0) subscribeToKeywords(activeNames);
    } catch (err) {
      console.error('Failed to load entities:', err);
    }
  }, []);

  const startPolling = useCallback(() => {
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
      onToast?.('已关注，正在生成简介和关系', 'success');
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
      onToast?.('已重新生成', 'success');
      await loadEntities();
      if (selectedId === id) loadDetail(id);
    } catch {
      onToast?.('重新生成失败，稍后再试', 'error');
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
      onToast?.('已取消关注', 'success');
    } catch {
      onToast?.('取消关注失败，稍后再试', 'error');
    }
  };

  const selectedEntity = entities.find((e) => e.id === selectedId) ?? null;
  const backToList = () => { setSelectedId(null); setDetail(null); };

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-10">
      {/* List. Mobile shows either the list or one entity; desktop shows both. */}
      <div className={cn('min-w-0 lg:sticky lg:top-6 lg:self-start', selectedEntity && 'hidden lg:block')}>
        <h2 className="text-lg font-bold">站长追踪</h2>
        {isAdmin ? (
          <form onSubmit={handleAdd} className="mt-3 flex gap-2">
            <input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="公司、模型或产品名，如 Claude"
              aria-label="要关注的名称"
              disabled={isAdding}
              className="min-w-0 flex-1 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isAdding || !newKeyword.trim()}
              className="flex items-center gap-1 rounded-lg bg-[var(--accent-blue)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              关注
            </button>
          </form>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">站长持续追踪的公司、模型和产品，点开看简介、关系和最新动态。</p>
            {/* Add / refresh / delete are admin-only (server/src/auth/admin.guard.ts); this is the way in. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-muted)]">
              <span>站长登录后可以添加、更新和删除关注。</span>
              <AdminSignIn />
            </div>
          </>
        )}

        <div className="mt-4 border-t border-[var(--border-subtle)] lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto">
          {entities.length === 0 ? (
            <p className="py-8 text-sm leading-relaxed text-[var(--text-secondary)]">
              {isAdmin
                ? '还没有关注任何对象。在上面输入 Claude、OpenAI、Cursor 这类名称，系统会生成简介和关系，并汇总相关资讯。'
                : '站长还没有添加关注。想看某家公司的动态，可以先去主题页。'}
              {!isAdmin && (
                <Link href="/topics" className="ml-1 font-semibold text-[var(--accent-blue)] hover:underline">
                  看主题
                </Link>
              )}
            </p>
          ) : (
            entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                isSelected={selectedId === entity.id}
                isRefreshing={refreshingId === entity.id}
                onClick={() => handleSelectCard(entity)}
                onRefresh={isAdmin ? (e) => handleRefresh(e, entity.id) : undefined}
                onDelete={isAdmin ? (e) => handleDelete(e, entity.keyword.id, entity.id) : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail */}
      <div className={cn('min-w-0', !selectedEntity && 'hidden lg:block')}>
        {selectedEntity && (
          <button
            type="button"
            onClick={backToList}
            className="-ml-1 mb-3 flex items-center gap-0.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] lg:hidden"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            全部关注
          </button>
        )}
        {!selectedEntity ? (
          entities.length > 0 && <p className="pt-12 text-sm text-[var(--text-secondary)]">从左边选一个，查看它的简介、关系和最新资讯。</p>
        ) : loadingDetail ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-64" />
            <SkeletonList count={3} itemClassName="h-12" />
          </div>
        ) : detail ? (
          <DetailPanel entity={selectedEntity} detail={detail} />
        ) : null}
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────
const RELATED_GROUPS: { key: 'relatedProducts' | 'relatedCompanies' | 'relatedModels' | 'competesWith'; title: string }[] = [
  { key: 'relatedCompanies', title: '相关公司' },
  { key: 'relatedModels', title: '关联模型' },
  { key: 'relatedProducts', title: '集成产品' },
  { key: 'competesWith', title: '竞争对手' },
];

const IMPORTANCE: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'var(--heat-5)' },
  high: { label: '重要', color: 'var(--heat-4)' },
};

function DetailPanel({ entity, detail }: { entity: EntityCardSummary; detail: EntityCardDetail }) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeNews, setNodeNews] = useState<NewsItem[] | null>(null);
  const [loadingNodeNews, setLoadingNodeNews] = useState(false);

  const relData: RelatedData | null = (() => {
    try { return detail.relatedData ? JSON.parse(detail.relatedData) : null; } catch { return null; }
  })();

  const totalMentions = detail.trend.reduce((s, t) => s + t.count, 0);
  const type = entity.type ?? relData?.type ?? null;

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

  // Reset node selection when entity changes — adjust state during render by
  // comparing the previous prop value, instead of an effect (React-recommended).
  const [prevEntityId, setPrevEntityId] = useState(entity.id);
  if (entity.id !== prevEntityId) {
    setPrevEntityId(entity.id);
    setSelectedNode(null);
    setNodeNews(null);
  }

  const displayNews = selectedNode ? (nodeNews ?? []) : detail.latestNews;
  const groups = RELATED_GROUPS.filter((g) => (relData?.[g.key]?.length ?? 0) > 0);

  return (
    <div>
      <header>
        <h2 className="text-[22px] font-bold">
          {entity.name}
          {type && <span className="ml-2 text-[15px] font-normal text-[var(--text-muted)]">{ENTITY_TYPE_LABEL[type] ?? type}</span>}
        </h2>
        {entity.summary && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[var(--text-secondary)]">{entity.summary}</p>}
        <dl className="mt-4 flex gap-8">
          <Stat label="今天提及" value={entity.todayMentions} />
          <Stat label="近 7 天提及" value={totalMentions} />
          <Stat label="关联产品" value={relData?.relatedProducts?.length ?? 0} />
        </dl>
      </header>

      <div className="mt-8 space-y-8">
        <section aria-labelledby="graph">
          <h3 id="graph" className="mb-2 text-[15px] font-bold">关系</h3>
          <div className="h-80 overflow-hidden rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)]">
            <EntityRelationGraph entityName={entity.name} relatedData={relData} selectedNode={selectedNode} onNodeClick={handleNodeClick} />
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">点图里的名称，下面的资讯会换成和它相关的。</p>
        </section>
        <section aria-labelledby="trend">
          <h3 id="trend" className="mb-2 text-[15px] font-bold">近 7 天提及次数</h3>
          <div className="h-48 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
            <TrendChart data={detail.trend} name={entity.name} />
          </div>
        </section>
      </div>

      {groups.length > 0 && (
        <dl className="mt-8 border-t border-[var(--border-subtle)]">
          {groups.map((g) => (
            <div key={g.key} className="grid gap-x-6 gap-y-1.5 border-b border-[var(--border-subtle)] py-3 sm:grid-cols-[96px_minmax(0,1fr)]">
              <dt className="text-sm font-semibold">{g.title}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {relData![g.key].map((name) => {
                  const active = selectedNode === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleNodeClick(active ? null : name)}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[13px]',
                        active
                          ? 'bg-[var(--accent-blue)] text-[var(--on-accent)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {name}
                    </button>
                  );
                })}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section aria-labelledby="news" className="mt-8">
        <h3 id="news" className="flex flex-wrap items-baseline gap-x-3 text-[15px] font-bold">
          {selectedNode ? `和「${selectedNode}」相关的资讯` : '最新相关资讯'}
          {selectedNode && (
            <button
              type="button"
              onClick={() => handleNodeClick(null)}
              className="inline-flex items-center gap-0.5 text-[13px] font-normal text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              回到 {entity.name}
            </button>
          )}
        </h3>
        {loadingNodeNews ? (
          <SkeletonList count={3} itemClassName="mt-3 h-14" />
        ) : displayNews.length > 0 ? (
          <ul className="mt-1">
            {displayNews.map((n) => {
              const imp = n.importance ? IMPORTANCE[n.importance] : undefined;
              return (
                <li key={n.id} className="border-b border-[var(--border-subtle)] py-3.5">
                  <Link href={`/items/${n.id}`} className="text-base font-semibold leading-snug hover:text-[var(--accent-blue)]">
                    <ItemTitle item={n} />
                  </Link>
                  {n.summary && <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">{n.summary}</p>}
                  <p className="mt-1 flex flex-wrap gap-x-3 text-[13px] text-[var(--text-muted)]">
                    <SourceTag source={n.source} />
                    <time dateTime={n.publishedAt || n.createdAt}>{relativeTime(n.publishedAt || n.createdAt)}</time>
                    {imp && <span className="font-medium" style={{ color: imp.color }}>{imp.label}</span>}
                    {n.qualityScore != null && <span className="tabular-nums">评分 {Math.round(n.qualityScore)}</span>}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {selectedNode ? `最近没有提到「${selectedNode}」的精选资讯。` : '最近没有提到它的精选资讯，有新报道时会出现在这里。'}
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums" style={{ fontStretch: '80%' }}>{value}</dd>
    </div>
  );
}
