import { CuratedView } from '@/components/curated/CuratedView';
import { fetchCuratedSSR } from '@/lib/server-api';
import { generateHotspotListSchema, safeJsonLd } from '@/lib/structured-data';

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

export default async function CuratedPage() {
  const { items, total } = await fetchCuratedSSR('today', 50);

  // ItemList tells AI engines this page is an aggregated feed rather than one
  // article, so individual entries can be attributed to their own source.
  const listSchema = generateHotspotListSchema(
    items.map((item) => ({
      title: item.title,
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
      <CuratedView initialItems={items} initialTotal={total} />
    </>
  );
}
