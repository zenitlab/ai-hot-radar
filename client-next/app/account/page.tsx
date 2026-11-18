'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { changePassword, signOut, useSession } from '@/lib/auth';

const INPUT =
  'mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-[15px] focus:border-[var(--border-active)] focus:outline-none';

export default function AccountPage() {
  const session = useSession();
  const router = useRouter();
  const [oldPassword, setOld] = useState('');
  const [newPassword, setNew] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (session.status === 'loading') return null;
  if (!session.user) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-10 sm:px-6">
        <p className="text-[15px] text-[var(--text-secondary)]">
          还没有登录。
          <Link href="/login?next=/account" className="ml-1 font-semibold text-[var(--accent-blue)] hover:underline">去登录</Link>
        </p>
      </div>
    );
  }
  const user = session.user;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await changePassword(oldPassword, newPassword);
      setOld('');
      setNew('');
      setMsg({ ok: true, text: '密码已修改，其他设备上的登录已退出。' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : '修改失败，请稍后再试' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
      <div className="max-w-[480px] space-y-8">
        <header>
          <h1 className="text-[22px] font-bold">账号与密码</h1>
          <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
            {user.email}
            {user.isAdmin && <span className="ml-2 text-[13px] font-semibold text-[var(--accent-blue)]">管理员</span>}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">关注了 {user.follows.length} 个主题</p>
        </header>

        <section className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h2 className="mb-3 text-[17px] font-bold">修改密码</h2>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">
              原密码
              <input type="password" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOld(e.target.value)} className={INPUT} />
            </label>
            <label className="block text-sm font-medium">
              新密码
              <input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} className={INPUT} placeholder="至少 8 位" />
            </label>
            {msg && <p role="status" className={msg.ok ? 'text-sm text-[var(--accent-blue)]' : 'text-sm text-[var(--accent-red)]'}>{msg.text}</p>}
            <button type="submit" disabled={busy} className="rounded-lg bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-60">
              {busy ? '请稍候' : '修改密码'}
            </button>
          </form>
        </section>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            router.replace('/curated');
          }}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
