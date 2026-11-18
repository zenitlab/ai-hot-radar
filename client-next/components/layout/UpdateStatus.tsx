'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { getScanStatus, triggerHotspotCheck, type ScanStatus } from '@/services/api';
import { useIsAdmin } from '@/lib/admin';
import { cn } from '@/lib/utils';
import { useDismiss } from './useDismiss';

const POLL_MS = 60_000;
const SCANNING_POLL_MS = 5_000;

/**
 * Next scheduled scan, mirroring the crons in server/src/scheduler/hotspot.scheduler.ts:
 * every 30 minutes from 08:00 to 23:30 Beijing time, hourly from 00:00 to 07:00.
 */
export function nextScheduledScan(now: Date): Date {
  const BJ = 8 * 3600_000;
  const t = new Date(now.getTime() + BJ); // Beijing wall clock in UTC fields
  const h = t.getUTCHours();
  const m = t.getUTCMinutes();
  const next = new Date(t);
  next.setUTCSeconds(0, 0);
  if (h >= 8 && m < 30) next.setUTCMinutes(30);
  else {
    next.setUTCMinutes(0);
    next.setUTCHours(h + 1);
  }
  return new Date(next.getTime() - BJ);
}

const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60_000));

const clock = (d: Date) =>
  d.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });

function ago(iso: string | null, now: Date): string {
  if (!iso) return '尚未更新';
  const min = minutesBetween(new Date(iso), now);
  if (min < 1) return '刚刚更新';
  if (min < 60) return `${min} 分钟前更新`;
  return `${Math.floor(min / 60)} 小时前更新`;
}

/**
 * "N 分钟前更新" in the header. Visitors can reload the page's data; the
 * admin can also start a scan (the backend allows one every 10 minutes).
 */
export function UpdateStatus() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  const load = useCallback(() => {
    getScanStatus()
      .then((s) => {
        setStatus(s);
        setNow(new Date());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, status?.isScanning ? SCANNING_POLL_MS : POLL_MS);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', load);
    };
  }, [load, status?.isScanning]);

  // A scan just finished: show the new items without a full reload.
  const wasScanning = useRef(false);
  useEffect(() => {
    if (wasScanning.current && status && !status.isScanning) router.refresh();
    wasScanning.current = Boolean(status?.isScanning);
  }, [status, router]);

  const scan = async () => {
    setNote('');
    try {
      const res = await triggerHotspotCheck();
      if (res.reason === 'cooldown' && res.nextManualScanAt) {
        setNote(`刚扫描过，${clock(new Date(res.nextManualScanAt))} 后可以再扫`);
      } else if (res.reason === 'already_running') {
        setNote('已经在扫描了');
      }
      load();
    } catch (err) {
      setNote(err instanceof Error && err.message ? err.message : '没能开始扫描');
    }
  };

  const scanning = Boolean(status?.isScanning);
  // Until the first status arrives, say nothing that could be wrong.
  const label = !status ? '更新状态' : scanning ? '正在更新' : ago(status.lastScanFinishedAt, now);
  const next = nextScheduledScan(now);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((o) => !o);
          load();
        }}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <RefreshCw className={cn('h-4 w-4', scanning && 'animate-spin')} aria-hidden="true" />
        <span className="hidden sm:inline tabular-nums">{label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="更新状态"
          className="absolute right-0 top-11 z-50 w-72 rounded-xl border border-[var(--card-border)] bg-[var(--dropdown-bg)] p-4 text-sm shadow-lg"
        >
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">上次更新</dt>
              <dd className="tabular-nums">
                {status?.lastScanFinishedAt ? clock(new Date(status.lastScanFinishedAt)) : '暂无记录'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">下次自动更新</dt>
              <dd className="tabular-nums">
                {scanning ? '正在进行' : `约 ${clock(next)}（${minutesBetween(now, next)} 分钟后）`}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            白天每 30 分钟、夜间每小时抓取一次全部信源。
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                router.refresh();
                load();
              }}
              className="flex-1 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-[13px] font-medium hover:border-[var(--card-border-hover)]"
            >
              刷新页面
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={scan}
                disabled={scanning}
                className="flex-1 rounded-lg bg-[var(--accent-blue)] px-3 py-1.5 text-[13px] font-medium text-[var(--on-accent)] disabled:opacity-50"
              >
                {scanning ? '扫描中' : '立即扫描'}
              </button>
            )}
          </div>
          {note && <p className="mt-2 text-xs text-[var(--text-secondary)]">{note}</p>}

        </div>
      )}
    </div>
  );
}
