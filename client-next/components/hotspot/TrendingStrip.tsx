'use client';
import { useEffect, useState } from "react";
import { Flame, TrendingUp, Sparkles } from "lucide-react";
import { hotspotsApi, type TrendingEvent } from "../../services/api";
import Link from "next/link";
import { getSourceLabel } from "../../lib/sourceMeta";

/**
 * "多源热议" strip: events reported by 2+ independent sources in the last 48h,
 * ranked by cross-source heat (server: utils/event-heat.ts). Renders nothing
 * until there is at least one corroborated event, so it never shows an empty box.
 *
 * `initialEvents` is prefetched by app/hotspot/page.tsx so the list is in the
 * first HTML (crawlers don't run JS). When it's provided, even as an empty
 * array, the client doesn't refetch on mount.
 */
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
        <Flame className="w-4 h-4 text-orange-500" aria-hidden="true" />
        多源热议
        <span className="font-normal text-xs text-[var(--text-muted)]">· 48 小时内多家来源同时报道</span>
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
                {e.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
                <span>{e.sourceCount} 家来源</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{e.sources.slice(0, 3).map(getSourceLabel).join('、')}{e.sources.length > 3 ? ' 等' : ''}</span>
                {e.trend === 'new' && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="w-3 h-3" aria-hidden="true" />新
                  </span>
                )}
                {e.trend === 'rising' && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-orange-700 dark:text-orange-400">
                    <TrendingUp className="w-3 h-3" aria-hidden="true" />上升
                  </span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]" title="热度指数：每家来源按 24 小时半衰期衰减后相加">
              {e.heat.toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
