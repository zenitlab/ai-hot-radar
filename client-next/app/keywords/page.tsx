'use client';

import { useState, useSyncExternalStore } from 'react';
import { KeywordsView } from '@/components/keywords/KeywordsView';
import { FollowedFeed } from '@/components/follows/FollowedFeed';
import { Toast, type ToastData } from '@/components/common/Toast';
import { useFollows } from '@/lib/follows';
import { cn } from '@/lib/utils';

type Tab = 'mine' | 'owner';
const TABS: { id: Tab; label: string }[] = [
  { id: 'mine', label: '我关注的主题' },
  { id: 'owner', label: '站长追踪' },
];

// The tab lives in the URL hash (#owner) so it survives a reload and can be linked.
const readHash = (): Tab => (window.location.hash === '#owner' ? 'owner' : 'mine');
const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

/**
 * 我的关注: the reader's followed topics (kept in their browser, lib/follows.ts)
 * and the entities the site owner tracks (KeywordsView, admin-editable).
 */
export default function KeywordsPage() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const tab = useSyncExternalStore(subscribeHash, readHash, () => 'mine' as Tab);
  const follows = useFollows();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <Toast toast={toast} />
      <div className="mx-auto max-w-[1180px] px-4 pt-6 sm:px-6 lg:pt-8">
        <h1 className="text-[22px] font-bold">我的关注</h1>
        <div role="tablist" aria-label="关注" className="mt-3 flex gap-6 border-b border-[var(--border-subtle)]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                window.location.hash = t.id === 'owner' ? 'owner' : '';
              }}
              className={cn(
                '-mb-px border-b-2 pb-2.5 pt-1 text-[15px]',
                tab === t.id
                  ? 'border-[var(--accent-blue)] font-semibold text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {t.label}
              {t.id === 'mine' && follows.length > 0 && <span className="ml-1.5 text-[13px] tabular-nums text-[var(--text-muted)]">{follows.length}</span>}
            </button>
          ))}
        </div>
      </div>
      {tab === 'mine' ? (
        <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-6 sm:px-6">
          <FollowedFeed />
        </div>
      ) : (
        <KeywordsView onToast={showToast} />
      )}
    </>
  );
}
