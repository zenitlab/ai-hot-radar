import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DigestView } from '@/components/digest/DigestView';
import { fetchDigestSSR, fetchRecentDigestsSSR } from '@/lib/server-api';
import { generateDigestSchema, safeJsonLd } from '@/lib/structured-data';
import type { DigestData } from '@/types';

/**
 * One indexable URL per day, e.g. `/digest/2026-07-30`.
 *
 * Rendered per request rather than prerendered. `generateStaticParams` would
 * need the backend at build time, but `next build` runs in an isolated Docker
 * builder stage that can't reach it — see `lib/server-api.ts`. Dynamic
 * rendering keeps builds green and still puts real content in the first
 * response, which is what crawlers read.
 */
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Guard the route segment: it lands in fetch URLs and page metadata. */
function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>;
}): Promise<Metadata> {
  const { date } = await params;

  if (!isValidDate(date)) {
    return { title: '日报不存在' };
  }

  const record = await fetchDigestSSR(date);
  const summary = record?.data?.summary?.trim();

  // Per-day title and description give each date a distinct snippet in search
  // and AI results, instead of every day sharing the generic /digest metadata.
  const title = `${date} AI 日报`;
  const description = summary
    ? summary.slice(0, 160)
    : `${date} 的 AI 资讯日报，涵盖国内外动态、模型情报、产品发布、社区讨论与论文研究。`;

  return {
    title,
    description,
    openGraph: { title: `${title} | AI Hot Radar`, description, type: 'article' },
    twitter: { title: `${title} | AI Hot Radar`, description },
    alternates: { canonical: `/digest/${date}` },
  };
}

/** Section labels present in this digest, used for the Article schema. */
const SECTION_LABELS: Array<[keyof DigestData, string]> = [
  ['domestic', '国内动态'],
  ['international', '国际动态'],
  ['modelIntel', '模型情报'],
  ['products', '产品发布'],
  ['community', '社区讨论'],
  ['papers', '论文研究'],
];

export default async function DigestDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  if (!isValidDate(date)) notFound();

  // Both in parallel: the digest itself and the sidebar's date list.
  const [record, recent] = await Promise.all([
    fetchDigestSSR(date),
    fetchRecentDigestsSSR(),
  ]);

  // Article schema marks this as a dated, attributable report rather than a
  // generic page — the shape AI search engines look for when deciding what to
  // cite. Only emitted when the digest exists.
  const sections = record?.data
    ? SECTION_LABELS.filter(([key]) => {
        const value = record.data[key];
        return Array.isArray(value) ? value.length > 0 : Boolean(value);
      }).map(([, label]) => label)
    : [];

  return (
    <>
      {sections.length > 0 && (
        <script
          type="application/ld+json"
          // safeJsonLd, not JSON.stringify: section labels are fixed here, but
          // this schema is the one that grows to carry scraped titles.
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(generateDigestSchema(date, sections)),
          }}
        />
      )}
      <DigestView date={date} initialDigest={record} initialRecent={recent} />
    </>
  );
}
