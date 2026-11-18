'use client';
import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { MAX_FOLLOWS, toggleFollow, useFollows } from '@/lib/follows';
import { cn } from '@/lib/utils';

/** Follow / unfollow one topic; the choice lives in this browser (lib/follows.ts). */
export function FollowButton({ slug, name, size = 'sm', className }: { slug: string; name: string; size?: 'sm' | 'md'; className?: string }) {
  const following = useFollows().includes(slug);
  const [full, setFull] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={following}
      aria-label={following ? `取消关注 ${name}` : `关注 ${name}`}
      title={full ? `最多关注 ${MAX_FOLLOWS} 个主题` : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setFull(!toggleFollow(slug));
      }}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-lg border font-medium',
        size === 'md' ? 'h-9 px-3.5 text-sm' : 'h-7 px-2.5 text-[13px]',
        following
          ? 'border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          : 'border-[var(--accent-blue)] text-[var(--accent-blue)] hover:bg-[var(--bg-hover)]',
        className,
      )}
    >
      {following ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
      {full ? '已达上限' : following ? '已关注' : '关注'}
    </button>
  );
}
