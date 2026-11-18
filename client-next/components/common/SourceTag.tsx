import { getSourceIcon, getSourceLabel } from '@/lib/sourceMeta';
import { cn } from '@/lib/utils';

/** Source name with its site icon, for the meta line under a title. */
export function SourceTag({ source, className, iconClassName = 'h-3.5 w-3.5' }: { source: string; className?: string; iconClassName?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      {getSourceIcon(source, iconClassName)}
      <span className="truncate">{getSourceLabel(source)}</span>
    </span>
  );
}
