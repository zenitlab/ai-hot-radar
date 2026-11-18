'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth';

interface Overview {
  scan: { isScanning: boolean; lastScanStartedAt: string | null; lastScanFinishedAt: string | null; lastScanError: string | null };
  ai: { calls: number; errors: number; retries: number; totalTokens: number; byKind: Record<string, number> };
  content: { hotspots: number; hotspots24h: number; curated24h: number; untranslated: number; keywords: number };
  users: { total: number; new7d: number; active7d: number };
  digests: Array<{ date: string; createdAt: string; fallback: boolean; highlights: number }>;
}

interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  follows: string[];
  createdAt: string;
  lastLoginAt: string | null;
  sessions: number;
}

const CARD = 'rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)]';
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin/${path}`, { cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || `HTTP ${res.status}`);
  return data as T;
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-[13px] text-[var(--text-muted)]">{label}</dt>
      <dd className="text-2xl font-extrabold tabular-nums" style={{ fontStretch: '80%' }}>{value}</dd>
      {note && <dd className="text-xs text-[var(--text-muted)]">{note}</dd>}
    </div>
  );
}

function UserRow({ u, onChanged }: { u: AdminUser; onChanged: () => void }) {
  const [resetting, setResetting] = useState(false);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api(`users/${u.id}/password`, { method: 'POST', body: JSON.stringify({ password: pw }) });
      setMsg('已重置，把新密码告诉对方；对方已在所有设备退出。');
      setPw('');
      setResetting(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '重置失败');
    }
  };

  const remove = async () => {
    if (!window.confirm(`删除用户 ${u.email}？账号和关注会一起删除，不能恢复。`)) return;
    try {
      await api(`users/${u.id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <tr className="border-t border-[var(--border-subtle)] align-top">
      <td className="py-3 pr-4">
        <span className="font-medium">{u.email}</span>
        {u.isAdmin && <span className="ml-2 text-xs font-semibold text-[var(--accent-blue)]">管理员</span>}
        {msg && <p className="mt-1 text-xs text-[var(--text-secondary)]">{msg}</p>}
        {resetting && (
          <form onSubmit={reset} className="mt-2 flex gap-2">
            <input
              type="text"
              required
              minLength={8}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="新密码，至少 8 位"
              className="w-48 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-2 py-1 text-sm focus:outline-none"
            />
            <button type="submit" className="rounded-md bg-[var(--accent-blue)] px-2.5 py-1 text-xs font-semibold text-[var(--on-accent)]">确定</button>
            <button type="button" onClick={() => setResetting(false)} className="text-xs text-[var(--text-muted)]">取消</button>
          </form>
        )}
      </td>
      <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">{fmt(u.createdAt)}</td>
      <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">{fmt(u.lastLoginAt)}</td>
      <td className="py-3 pr-4 text-[var(--text-secondary)]" title={u.follows.join('、')}>{u.follows.length}</td>
      <td className="py-3 pr-4 tabular-nums text-[var(--text-secondary)]">{u.sessions}</td>
      <td className="whitespace-nowrap py-3 text-right">
        <button type="button" onClick={() => setResetting((r) => !r)} className="text-[13px] text-[var(--accent-blue)] hover:underline">重置密码</button>
        {!u.isAdmin && (
          <button type="button" onClick={remove} className="ml-3 text-[13px] text-[var(--accent-red)] hover:underline">删除</button>
        )}
      </td>
    </tr>
  );
}

/**
 * Site owner's dashboard: site numbers, recent digests and registered users.
 * Everyone else gets the same "页面不存在" a missing page shows; the backend
 * refuses the data anyway (AdminGuard).
 */
export default function AdminPage() {
  const session = useSession();
  const isAdmin = session.status === 'ready' && !!session.user?.isAdmin;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([api<Overview>('overview'), api<AdminUser[]>('users')])
      .then(([o, u]) => {
        setOverview(o);
        setUsers(u);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (session.status === 'loading') return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-[1180px] px-4 pt-16 text-center sm:px-6">
        <h1 className="text-[22px] font-bold">页面不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          <Link href="/curated" className="font-semibold text-[var(--accent-blue)] hover:underline">回到首页</Link>
        </p>
      </div>
    );
  }

  const o = overview;
  return (
    <div className="mx-auto max-w-[1180px] space-y-8 px-4 pb-12 pt-6 sm:px-6 lg:pt-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[22px] font-bold">管理后台</h1>
        <div className="flex gap-4 text-sm">
          <Link href="/keywords#owner" className="font-semibold text-[var(--accent-blue)] hover:underline">管理站长追踪</Link>
          <button type="button" onClick={load} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">刷新</button>
        </div>
      </header>
      {error && <p className="text-sm text-[var(--accent-red)]">{error}</p>}

      {o && (
        <>
          <section>
            <h2 className="mb-3 text-lg font-bold">站点</h2>
            <dl className={`${CARD} grid grid-cols-2 divide-[var(--border-subtle)] sm:grid-cols-4 [&>div]:border-[var(--border-subtle)] [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0 sm:[&>div:nth-child(n+5)]:border-t`}>
              <Stat label="用户" value={o.users.total} note={`近 7 天新增 ${o.users.new7d}，登录过 ${o.users.active7d}`} />
              <Stat label="资讯总数" value={o.content.hotspots.toLocaleString()} />
              <Stat label="24 小时新增" value={o.content.hotspots24h} note={`精选 ${o.content.curated24h}，缺中文标题 ${o.content.untranslated}`} />
              <Stat label="站长追踪" value={o.content.keywords} />
              <Stat
                label="扫描"
                value={o.scan.isScanning ? '进行中' : '空闲'}
                note={`上次开始 ${fmt(o.scan.lastScanStartedAt)}，结束 ${fmt(o.scan.lastScanFinishedAt)}`}
              />
              <Stat label="本轮模型调用" value={o.ai.calls} note={`失败 ${o.ai.errors}，限流重试 ${o.ai.retries}`} />
              <Stat label="本轮 tokens" value={o.ai.totalTokens.toLocaleString()} />
              <Stat label="上次扫描出错" value={o.scan.lastScanError ? '是' : '否'} note={o.scan.lastScanError ?? undefined} />
            </dl>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">最近 7 期日报</h2>
            <ul className={`${CARD} divide-y divide-[var(--border-subtle)] px-4`}>
              {o.digests.map((d) => (
                <li key={d.date} className="flex flex-wrap items-baseline gap-x-4 py-2.5 text-sm">
                  <Link href={`/digest/${d.date}`} className="font-semibold tabular-nums hover:text-[var(--accent-blue)]">{d.date}</Link>
                  <span className="text-[var(--text-secondary)]">生成于 {fmt(d.createdAt)}</span>
                  <span className="text-[var(--text-secondary)]">重点 {d.highlights} 条</span>
                  {d.fallback && <span className="font-medium text-[var(--accent-amber)]">简版（模型生成失败）</span>}
                </li>
              ))}
              {o.digests.length === 0 && <li className="py-3 text-sm text-[var(--text-secondary)]">还没有日报。</li>}
            </ul>
          </section>
        </>
      )}

      {users && (
        <section>
          <h2 className="mb-3 text-lg font-bold">注册用户 {users.length}</h2>
          <div className={`${CARD} overflow-x-auto px-4`}>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[13px] text-[var(--text-muted)]">
                  <th className="py-2.5 pr-4 font-normal">邮箱</th>
                  <th className="py-2.5 pr-4 font-normal">注册</th>
                  <th className="py-2.5 pr-4 font-normal">最后登录</th>
                  <th className="py-2.5 pr-4 font-normal">关注</th>
                  <th className="py-2.5 pr-4 font-normal">登录设备</th>
                  <th className="py-2.5 font-normal" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <UserRow key={u.id} u={u} onChanged={load} />
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="py-4 text-sm text-[var(--text-secondary)]">还没有人注册。</p>}
          </div>
        </section>
      )}
    </div>
  );
}
