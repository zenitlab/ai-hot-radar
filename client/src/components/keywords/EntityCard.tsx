import { RefreshCw, Trash2, Clock, Flame, Package, Cpu, Building2, User, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { relativeTime } from '../../utils/relativeTime';
import type { EntityCardSummary, RelatedData } from '../../services/api';

const TYPE_ICON: Record<string, React.ReactNode> = {
  model:      <Cpu className="w-3.5 h-3.5" />,
  company:    <Building2 className="w-3.5 h-3.5" />,
  product:    <Package className="w-3.5 h-3.5" />,
  technology: <Zap className="w-3.5 h-3.5" />,
  person:     <User className="w-3.5 h-3.5" />,
};

const TYPE_COLOR: Record<string, string> = {
  model:      'bg-blue-500/10 text-blue-400 border-blue-500/20',
  company:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  product:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  technology: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  person:     'bg-red-500/10 text-red-400 border-red-500/20',
};

interface EntityCardProps {
  entity: EntityCardSummary;
  isSelected: boolean;
  isRefreshing: boolean;
  onClick: () => void;
  onRefresh: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function EntityCard({ entity, isSelected, isRefreshing, onClick, onRefresh, onDelete }: EntityCardProps) {
  const relData: RelatedData | null = (() => {
    try { return entity.relatedData ? JSON.parse(entity.relatedData) : null; } catch { return null; }
  })();

  const type = entity.type ?? relData?.type ?? 'technology';
  const typeLabel = { model: '模型', company: '公司', product: '产品', technology: '技术', person: '人物' }[type] ?? type;
  const products = relData?.relatedProducts?.slice(0, 4) ?? [];
  const tags = relData?.tags?.slice(0, 3) ?? [];
  const isLoading = !entity.relatedData;

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-2xl border cursor-pointer transition-all duration-200',
        'hover:-translate-y-0.5',
        isSelected
          ? 'bg-[var(--accent-blue)]/8 border-[var(--accent-blue)]/40 dark:bg-blue-500/12 dark:border-blue-500/45 shadow-md shadow-[var(--accent-blue)]/10 ring-1 ring-[var(--accent-blue)]/20 dark:ring-blue-500/20'
          : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--card-border-hover)]',
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0', TYPE_COLOR[type] ?? TYPE_COLOR.technology)}>
            {TYPE_ICON[type] ?? TYPE_ICON.technology}
            {typeLabel}
          </span>
          <h3 className="font-semibold text-[var(--text-primary)] truncate">{entity.name}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={onRefresh}
            title="刷新"
            disabled={isRefreshing}
            className="p-1 rounded text-[var(--text-muted)] hover:text-blue-400 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
          </button>
          <button
            onClick={onDelete}
            title="删除"
            className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      {isLoading ? (
        <div className="space-y-1.5 mb-3">
          <div className="h-2.5 bg-[var(--input-bg)] rounded animate-pulse w-full" />
          <div className="h-2.5 bg-[var(--input-bg)] rounded animate-pulse w-4/5" />
        </div>
      ) : (
        <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2 leading-relaxed">
          {entity.summary ?? '摘要生成中...'}
        </p>
      )}

      {/* Heat metric */}
      <div className="flex items-center gap-3 mb-2.5 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-400" />
          今日提及 <span className={cn('font-semibold ml-0.5', entity.todayMentions > 0 ? 'text-orange-400' : 'text-[var(--text-muted)]')}>{entity.todayMentions}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {relativeTime(entity.lastRefresh)}
        </span>
      </div>

      {/* Related products */}
      {products.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {products.map((p) => (
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--text-secondary)]">
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/8 text-blue-400 border border-blue-500/15">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Latest news */}
      {entity.latestNews.length > 0 && (
        <div className="space-y-1">
          {entity.latestNews.slice(0, 2).map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block text-[11px] text-[var(--text-secondary)] hover:text-blue-400 transition-colors truncate leading-snug"
            >
              • {n.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
