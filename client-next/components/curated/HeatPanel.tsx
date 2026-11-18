import Link from 'next/link';
import type { TrendingEvent } from '@/services/api';
import { HEAT_LEGEND, heatColor, heatIndex } from '@/lib/heat';
import { displayTitle } from '@/lib/utils';

const eventTitle = (e: TrendingEvent) => e.overview?.title || displayTitle(e);
const eventHref = (e: TrendingEvent) => (e.clusterKey ? `/story/${e.clusterKey}` : `/items/${e.id}`);

function Change({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined) return <span className="text-[var(--text-muted)]">新上榜</span>;
  if (Math.abs(pct) < 5) return <span className="text-[var(--text-muted)]">持平</span>;
  return pct > 0 ? (
    <span className="text-[var(--heat-5)]">
      <span className="sr-only">上升</span>+{pct}%
    </span>
  ) : (
    <span className="text-[var(--text-muted)]">
      <span className="sr-only">下降</span>
      {pct}%
    </span>
  );
}

/**
 * "此刻在发酵的事": the top of the hot board on the homepage. The bar's
 * length is heat relative to the hottest event, its colour the absolute heat
 * step, so a quiet day reads as cool rather than looking like a busy one.
 * Server component; renders nothing when no event has two sources yet.
 */
export function HeatPanel({ events }: { events: TrendingEvent[] }) {
  if (events.length === 0) return null;
  const max = Math.max(...events.map((e) => e.heat)) || 1;

  return (
    <section aria-labelledby="now" className="mb-8 rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id="now" className="text-lg font-bold sm:text-xl">此刻在发酵的事</h2>
        <span className="hidden items-center gap-1 text-xs text-[var(--text-muted)] sm:flex" aria-hidden="true">
          热度低
          {HEAT_LEGEND.map((c) => (
            <i key={c} className="h-1.5 w-3.5 rounded-sm" style={{ background: c }} />
          ))}
          高
        </span>
      </div>
      <ol>
        {events.map((e) => {
          const index = heatIndex(e.heat);
          const color = heatColor(index);
          return (
            <li key={e.id} className="border-t border-[var(--border-subtle)] first:border-t-0">
              <Link
                href={eventHref(e)}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[112px_minmax(0,1fr)_auto]"
              >
                <span className="order-3 col-span-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)] sm:order-none sm:col-span-1 sm:h-2" aria-hidden="true">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(8, (e.heat / max) * 100)}%`, background: color }} />
                </span>
                <span className="text-[15px] font-semibold leading-snug group-hover:text-[var(--accent-blue)] sm:text-base">
                  {eventTitle(e)}
                </span>
                <span className="flex items-baseline gap-3 whitespace-nowrap text-[13px] text-[var(--text-muted)]">
                  <span className="hidden sm:inline">{e.sourceCount} 个来源</span>
                  <Change pct={e.changePct} />
                  <span className="min-w-7 text-right text-xl font-extrabold tabular-nums" style={{ color, fontStretch: '80%' }}>
                    <span className="sr-only">热度</span>
                    {index}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <Link href="/hot" className="mt-1 inline-block text-sm font-semibold text-[var(--accent-blue)] hover:underline">
        看完整热点榜
      </Link>
    </section>
  );
}
