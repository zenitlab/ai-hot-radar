'use client';
import { RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { relativeTime } from '../../utils/relativeTime';
import { Skeleton } from '../common/Loader';
import type { EntityCardSummary, RelatedData } from '../../services/api';

export const ENTITY_TYPE_LABEL: Record<string, string> = {
  model: '模型',
  company: '公司',
  product: '产品',
  technology: '技术',
  person: '人物',
};

interface EntityCardProps {
  entity: EntityCardSummary;
  isSelected: boolean;
  isRefreshing: boolean;
  onClick: () => void;
  /** Admin only; the buttons are hidden when absent. */
  onRefresh?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

/** One followed entity as a list row (DESIGN.md: lists use hairlines, not cards). */
export function EntityCard({ entity, isSelected, isRefreshing, onClick, onRefresh, onDelete }: EntityCardProps) {
  const relData: RelatedData | null = (() => {
    try { return entity.relatedData ? JSON.parse(entity.relatedData) : null; } catch { return null; }
  })();

  const type = entity.type ?? relData?.type ?? 'technology';
  const isLoading = !entity.relatedData;

  return (
    <div
      className={cn(
        'relative border-b border-[var(--border-subtle)] py-3.5 pl-3 pr-1',
        isSelected ? 'bg-[var(--bg-elevated)]' : 'hover:bg-[var(--bg-hover)]',
      )}
    >
      {isSelected && <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--accent-blue)]" aria-hidden="true" />}
      {/* Main select action — a sibling overlay button so nested controls stay valid */}
      <button
        type="button"
        onClick={onClick}
        aria-label={`查看 ${entity.name}`}
        aria-pressed={isSelected}
        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-blue)]"
      />

      <div className="flex items-baseline justify-between gap-2">
        <h3 className={cn('min-w-0 truncate text-[15px] font-semibold', isSelected && 'text-[var(--accent-blue)]')}>
          {entity.name}
          <span className="ml-2 text-[13px] font-normal text-[var(--text-muted)]">{ENTITY_TYPE_LABEL[type] ?? type}</span>
        </h3>
        {onRefresh && onDelete && (
          <div className="relative z-20 flex shrink-0 items-center">
            <button
              type="button"
              onClick={onRefresh}
              title="重新生成简介和关系"
              aria-label={`重新生成 ${entity.name} 的简介和关系`}
              disabled={isRefreshing}
              className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-blue)] disabled:opacity-40"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              title="取消关注"
              aria-label={`取消关注 ${entity.name}`}
              className="rounded p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-red)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-2 space-y-1.5 pr-3">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>
      ) : (
        entity.summary && (
          <p className="mt-1 line-clamp-2 pr-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">{entity.summary}</p>
        )
      )}

      <p className="mt-1.5 flex gap-3 text-xs text-[var(--text-muted)]">
        <span>
          今天提及{' '}
          <span className={cn('font-semibold tabular-nums', entity.todayMentions > 0 && 'text-[var(--heat-4)]')}>{entity.todayMentions}</span>
        </span>
        <span>{isLoading ? '正在生成简介' : `${relativeTime(entity.lastRefresh)}更新`}</span>
      </p>
    </div>
  );
}
