'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useDismiss } from './useDismiss';

const ITEM = 'block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--dropdown-item-hover)]';

/** Header account control: 登录 when signed out, otherwise the email's initial with a menu. */
export function AccountMenu() {
  const session = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  if (session.status === 'loading') return <span className="h-9 w-9" aria-hidden="true" />;
  const user = session.user;
  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="flex h-9 items-center rounded-lg px-2.5 text-sm font-medium text-[var(--accent-blue)] hover:bg-[var(--bg-hover)]"
      >
        登录
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`账号 ${user.email}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold uppercase',
          user.isAdmin ? 'bg-[var(--accent-blue)] text-[var(--on-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)]',
        )}
      >
        {user.email[0]}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-[var(--card-border)] bg-[var(--dropdown-bg)] p-1 shadow-lg" onClick={() => setOpen(false)}>
          <p className="truncate px-3 pb-1 pt-2 text-[13px] text-[var(--text-muted)]">{user.email}</p>
          <Link href="/keywords" className={ITEM}>我的关注</Link>
          <Link href="/account" className={ITEM}>账号与密码</Link>
          {user.isAdmin && <Link href="/admin" className={ITEM}>管理后台</Link>}
          <button
            type="button"
            className={cn(ITEM, 'border-t border-[var(--border-subtle)] text-[var(--text-secondary)]')}
            onClick={async () => {
              await signOut();
              router.refresh();
            }}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
