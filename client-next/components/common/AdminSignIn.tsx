'use client';
import { useState } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { signInAdmin, signOutAdmin, useIsAdmin } from '@/lib/admin';
import { cn } from '@/lib/utils';

/**
 * Site-owner sign-in: one token field, checked against the backend before it
 * is stored. Admin mode reveals scan, digest-generate and keyword controls.
 */
export function AdminSignIn({ className }: { className?: string }) {
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'wrong'>('idle');

  if (isAdmin) {
    return (
      <button
        type="button"
        onClick={signOutAdmin}
        className={cn('flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]', className)}
      >
        <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
        退出管理员
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]', className)}
      >
        <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
        管理员登录
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('checking');
    const ok = await signInAdmin(token);
    if (ok) {
      setToken('');
      setOpen(false);
      setState('idle');
    } else {
      setState('wrong');
    }
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="admin-token" className="text-xs text-[var(--text-muted)]">管理员口令</label>
      <div className="flex gap-1.5">
        <input
          id="admin-token"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setState('idle');
          }}
          className="min-w-0 flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-active)]"
        />
        <button
          type="submit"
          disabled={!token.trim() || state === 'checking'}
          className="rounded-md bg-[var(--accent-blue)] px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {state === 'checking' ? '验证中' : '登录'}
        </button>
      </div>
      {state === 'wrong' && <p className="text-xs text-[var(--accent-red)]">口令不对，或服务器没有配置 ADMIN_TOKEN</p>}
      <button type="button" onClick={() => setOpen(false)} className="self-start text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        取消
      </button>
    </form>
  );
}
