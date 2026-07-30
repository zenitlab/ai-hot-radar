import { HotspotView } from '@/components/hotspot/HotspotView';
import { fetchHotspotsSSR } from '@/lib/server-api';

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

export default async function HotspotPage() {
  const { data, pagination } = await fetchHotspotsSSR(20);

  return (
    <HotspotView
      initialHotspots={data}
      initialTotal={pagination.total}
      initialTotalPages={pagination.totalPages}
    />
  );
}
