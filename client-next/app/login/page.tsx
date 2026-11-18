'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthError, signIn, signUp, useSession } from '@/lib/auth';
import { useFollows } from '@/lib/follows';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

/** Only same-site paths, so ?next= can't send people elsewhere after sign-in. */
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/keywords');

const INPUT =
  'mt-1 w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2.5 text-[15px] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const session = useSession();
  const follows = useFollows();
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [adminToken, setAdminToken] = useState<string | null>(null);

  if (session.status === 'ready' && session.user) {
    return (
      <p className="text-[15px] text-[var(--text-secondary)]">
        已登录为 {session.user.email}。
        <Link href={next} className="ml-1 font-semibold text-[var(--accent-blue)] hover:underline">
          继续
        </Link>
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await signIn(email, password);
      else await signUp(email, password, follows, adminToken ?? undefined);
      router.replace(next);
      router.refresh();
    } catch (err) {
      if (err instanceof AuthError && err.needAdminToken && adminToken === null) setAdminToken('');
      setError(err instanceof Error ? err.message : '操作失败，请稍后再试');
      setBusy(false);
    }
  };

  return (
    <>
      <div role="tablist" className="mb-5 flex gap-6 border-b border-[var(--border-subtle)]">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={cn(
              '-mb-px border-b-2 pb-2.5 text-[15px]',
              mode === m ? 'border-[var(--accent-blue)] font-semibold' : 'border-transparent text-[var(--text-secondary)]',
            )}
          >
            {m === 'login' ? '登录' : '注册'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">
          邮箱
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} placeholder="you@example.com" />
        </label>
        <label className="block text-sm font-medium">
          密码
          <input
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
            placeholder={mode === 'register' ? '至少 8 位' : ''}
          />
        </label>
        {mode === 'register' && adminToken !== null && (
          <label className="block text-sm font-medium">
            管理员口令
            <input type="password" required autoComplete="off" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} className={INPUT} />
            <span className="mt-1 block text-xs font-normal text-[var(--text-muted)]">服务器 .env.production 里的 ADMIN_TOKEN，只在注册管理员账号时用一次。</span>
          </label>
        )}
        {error && <p className="text-sm text-[var(--accent-red)]" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--accent-blue)] py-2.5 text-[15px] font-semibold text-[var(--on-accent)] hover:opacity-90 disabled:opacity-60"
        >
          {busy ? '请稍候' : mode === 'login' ? '登录' : '注册并登录'}
        </button>
      </form>

      <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-muted)]">
        {mode === 'register'
          ? follows.length > 0
            ? `注册后，这台设备上关注的 ${follows.length} 个主题会存进账号，换设备登录也能看到。`
            : '注册后，关注的主题存在账号里，换设备登录也能看到。'
          : '忘记密码暂时只能联系站长重置。'}
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 pb-12 pt-10 sm:px-6">
      <div className="mx-auto max-w-[400px] rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 sm:p-8">
        <h1 className="mb-1 text-[22px] font-bold">登录 AI 热点雷达</h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">用邮箱登录，关注的主题会跟着账号走。</p>
        {/* useSearchParams needs a Suspense boundary in the App Router. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
