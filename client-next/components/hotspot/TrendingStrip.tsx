'use client';
import { useEffect, useState } from "react";
import { Flame, TrendingUp, Sparkles } from "lucide-react";
import { hotspotsApi, type TrendingEvent } from "../../services/api";
import Link from "next/link";
import { getSourceLabel } from "../../lib/sourceMeta";
import { displayTitle } from "../../lib/utils";
import { heatColor, heatIndex } from "../../lib/heat";

/**
 * "多源热议" strip: events reported by 2+ independent sources in the last 48h,
 * ranked by cross-source heat (server: utils/event-heat.ts). Renders nothing
 * until there is at least one corroborated event, so it never shows an empty box.
 *
 * `initialEvents` is prefetched by app/hotspot/page.tsx so the list is in the
 * first HTML (crawlers don't run JS). When it's provided, even as an empty
 * array, the client doesn't refetch on mount.
 */
/** Outlet names, once each: participants like "hackernews:alice" share their outlet's name. */
const outlets = (e: TrendingEvent) => [...new Set(e.sources.map((s) => getSourceLabel(s.split(':')[0])))];

export function TrendingStrip({
  limit = 5,
  initialEvents,
}: {
  limit?: number;
  initialEvents?: TrendingEvent[];
}) {
  const [events, setEvents] = useState<TrendingEvent[]>(initialEvents ?? []);

  useEffect(() => {
    if (initialEvents) return;
    let cancelled = false;
    hotspotsApi
      .getTrending(limit)
      .then((r) => { if (!cancelled) setEvents(r.data); })
      .catch(() => { /* optional section: hide on error */ });
    return () => { cancelled = true; };
  }, [limit, initialEvents]);

  if (events.length === 0) return null;

  return (
    <section aria-labelledby="trending-heading" className="mb-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <h2 id="trending-heading" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] mb-3">
        <Flame className="w-4 h-4 text-[var(--heat-4)]" aria-hidden="true" />
        多源热议
        <span className="font-normal text-xs text-[var(--text-muted)]">48 小时内多家来源同时报道</span>
        <Link href="/hot" className="ml-auto font-normal text-xs text-[var(--accent-blue)] hover:underline">完整榜单</Link>
      </h2>
      <ol className="space-y-2.5">
        {events.map((e, i) => (
          <li key={e.id} className="flex items-start gap-3">
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--text-muted)]">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/story/${e.clusterKey}`}
                className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-blue)] line-clamp-2"
              >
                {e.overview?.title || displayTitle(e)}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                <span>{e.sourceCount} 个来源</span>
                <span className="truncate">{outlets(e).slice(0, 3).join('、')}{outlets(e).length > 3 ? ' 等' : ''}</span>
                {e.trend === 'new' && (
                  <span className="inline-flex items-center gap-0.5 rounded border border-current px-1.5 text-[var(--heat-2)]">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />新
                  </span>
                )}
                {e.trend === 'rising' && (
                  <span className="inline-flex items-center gap-0.5 rounded border border-current px-1.5 text-[var(--heat-4)]">
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />上升
                  </span>
                )}
              </div>
            </div>
            <span
              className="shrink-0 text-base font-extrabold tabular-nums"
              style={{ color: heatColor(heatIndex(e.heat)), fontStretch: '80%' }}
              title="热度指数：每家来源最多 10 分，每 24 小时减半"
            >
              {heatIndex(e.heat)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
