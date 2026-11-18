import { CuratedView } from '@/components/curated/CuratedView';
import { CURATED_PAGE_SIZE, beijingToday } from '@/lib/curated';
import { HeatPanel } from '@/components/curated/HeatPanel';
import { HomeRail } from '@/components/curated/HomeRail';
import {
  fetchCuratedSSR,
  fetchDigestSSR,
  fetchRecentDigestsSSR,
  fetchTopicsSSR,
  fetchTrendingBoardSSR,
} from '@/lib/server-api';
import { generateHotspotListSchema, safeJsonLd } from '@/lib/structured-data';
import { displayTitle } from '@/lib/utils';

/**
 * Rendered per request rather than prerendered at build time.
 *
 * `next build` runs in an isolated Docker builder stage that is not on the
 * compose network, so the backend is unreachable and `NEXT_PUBLIC_API_URL` is
 * undefined there. Prerendering would bake an empty page into the image;
 * `force-dynamic` skips it, so the first visitor — often a crawler — gets real
 * content instead.
 */
export const dynamic = 'force-dynamic';

const HOT_COUNT = 6;

/**
 * Homepage (DESIGN.md, mockup design/mockups/a-radar.html): what's heating up
 * now, the last 7 days of 精选 grouped by day, and a rail with the latest
 * digest and company topics. Every block is in the first HTML.
 */
export default async function CuratedPage() {
  const today = beijingToday();
  const [{ items, total }, board, topics, recent] = await Promise.all([
    fetchCuratedSSR('week', CURATED_PAGE_SIZE),
    fetchTrendingBoardSSR(HOT_COUNT),
    fetchTopicsSSR(),
    fetchRecentDigestsSSR(),
  ]);
  const digest = recent[0] ? await fetchDigestSSR(recent[0].date) : null;

  // ItemList tells AI engines this page is an aggregated feed rather than one
  // article, so individual entries can be attributed to their own source.
  const listSchema = generateHotspotListSchema(
    items.map((item) => ({
      title: displayTitle(item),
      url: item.url,
      // publishedAt is optional on Hotspot; createdAt is always present.
      publishedAt: item.publishedAt || item.createdAt,
      description: item.summary,
    })),
    {
      name: '精选 AI 资讯',
      description: '经 AI 五维评分筛选的高质量 AI 行业资讯',
    },
  );

  return (
    <>
      {items.length > 0 && (
        <script
          type="application/ld+json"
          // safeJsonLd, not JSON.stringify: titles and summaries come from
          // scraped sources, so a `</script>` in one would break out of the tag.
          dangerouslySetInnerHTML={{ __html: safeJsonLd(listSchema) }}
        />
      )}
      <CuratedView
        initialItems={items}
        initialTotal={total}
        today={today}
        top={<HeatPanel events={board.events} />}
        rail={<HomeRail digest={digest} topics={topics} today={today} />}
      />
    </>
  );
}
