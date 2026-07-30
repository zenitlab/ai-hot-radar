import { redirect } from 'next/navigation';

/**
 * `/digest` is an alias for today's report. The canonical URLs live at
 * `/digest/[date]`, so each day can be indexed and cited independently.
 *
 * Dynamic because "today" depends on request time — prerendering would pin the
 * redirect to the build date.
 */
export const dynamic = 'force-dynamic';

/** Today in Asia/Shanghai, matching the backend's digest date keys. */
function getBeijingToday(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function DigestPage() {
  redirect(`/digest/${getBeijingToday()}`);
}
