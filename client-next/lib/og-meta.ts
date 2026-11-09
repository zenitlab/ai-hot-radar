/**
 * Default share image for pages that override `openGraph` / `twitter`.
 *
 * Next.js merges metadata shallowly: a segment that sets `openGraph` replaces
 * the parent's whole `openGraph`, image included. Spread these into any such
 * block so the page keeps the site card from app/opengraph-image.tsx.
 * Routes with their own opengraph-image file (story, items) don't need it.
 */
const IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'AI Hot Radar · AI 热点雷达' };

export const ogImages = { images: [IMAGE] };
export const twitterImages = { card: 'summary_large_image' as const, images: [IMAGE.url] };
