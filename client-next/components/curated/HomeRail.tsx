import Link from 'next/link';
import type { TopicsResponse } from '@/lib/server-api';
import type { DailyDigest } from '@/types';
import { BRAND_ICONS } from '@/lib/brandIcons';

const shortName = (name: string) => name.split(' / ')[0];

function DigestCard({ digest, today }: { digest: DailyDigest; today: string }) {
  const [, m, d] = digest.date.split('-').map(Number);
  const items = digest.data.highlights ?? [];
  const count = digest.data.itemCount;
  return (
    <section aria-labelledby="rail-digest" className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <h2 id="rail-digest" className="text-base font-bold">
        {digest.date === today ? '今日日报' : `${m}月${d}日日报`}
      </h2>
      {digest.data.summary && (
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)] line-clamp-2">{digest.data.summary}</p>
      )}
      {items.length > 0 && (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-snug marker:text-[var(--text-muted)]">
          {items.slice(0, 4).map((h) => (
            <li key={h.url}>
              <Link href={`/digest/${digest.date}`} className="hover:text-[var(--accent-blue)]">
                {h.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <Link href={`/digest/${digest.date}`} className="mt-3 inline-block text-sm font-semibold text-[var(--accent-blue)] hover:underline">
        {count ? `读日报，共 ${count} 条` : '读日报'}
      </Link>
    </section>
  );
}

function CompanyGrid({ topics }: { topics: TopicsResponse }) {
  const companies = topics.groups
    .find((g) => g.group === 'company')
    ?.topics.filter((t) => t.count > 0 && BRAND_ICONS[t.slug])
    .slice(0, 12);
  const total = topics.groups.reduce((n, g) => n + g.topics.filter((t) => t.count > 0).length, 0);
  if (!companies?.length) return null;
  return (
    <section aria-labelledby="rail-companies" className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <h2 id="rail-companies" className="text-base font-bold">按公司看</h2>
      <ul className="mt-3 grid grid-cols-3 gap-1">
        {companies.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              title={`${t.name}：近 ${topics.windowDays} 天 ${t.count} 条`}
              className="flex flex-col items-center gap-1.5 rounded-lg px-1 py-2.5 text-center text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              <span className="h-6 w-6 text-[var(--text-primary)]" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAND_ICONS[t.slug] }} />
              {shortName(t.name)}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/topics" className="mt-2 inline-block text-sm font-semibold text-[var(--accent-blue)] hover:underline">
        全部 {total} 个主题
      </Link>
    </section>
  );
}

/** Homepage right column: the latest digest and a way in by company. Server component. */
export function HomeRail({ digest, topics, today }: { digest: DailyDigest | null; topics: TopicsResponse | null; today: string }) {
  if (!digest && !topics) return null;
  return (
    <aside className="flex flex-col gap-5">
      {digest && <DigestCard digest={digest} today={today} />}
      {topics && <CompanyGrid topics={topics} />}
    </aside>
  );
}
