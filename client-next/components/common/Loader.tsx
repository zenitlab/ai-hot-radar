'use client';
import { cn } from '../../lib/utils';

/**
 * Unified loading primitives. Three flavors so each surface picks the right one:
 *
 * - <PageLoader />  : centered spinner — for whole-view async work
 * - <Skeleton />    : shimmer block — for predictable card lists
 * - <InlineSpinner/>: tiny inline spinner — for buttons / inline async
 *
 * All three pull from the same theme tokens so light + dark stay consistent.
 */

export function PageLoader({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16', className)}>
      <span className="relative flex w-9 h-9">
        <span className="absolute inset-0 rounded-full border-2 border-[var(--card-border)]" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent-blue)] animate-spin" />
      </span>
      {label && (
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      )}
    </div>
  );
}

/**
 * Single skeleton block. Use multiple stacked for list placeholders.
 * The shimmer animation is defined in index.css (--animate-shimmer).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-r from-[var(--input-bg)] via-[var(--card-bg-hover)] to-[var(--input-bg)] bg-[length:200%_100%] animate-shimmer',
        className,
      )}
    />
  );
}

/** Stack of N skeleton cards — one-liner for the common list case. */
export function SkeletonList({
  count = 5,
  itemClassName = 'h-28',
}: {
  count?: number;
  itemClassName?: string;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin',
        className,
      )}
    />
  );
}
