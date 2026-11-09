import { MetadataRoute } from 'next';

import { fetchRecentDigestsSSR, fetchStoryKeysSSR } from '@/lib/server-api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

/**
 * Generated per request so newly published digests appear without a rebuild —
 * the backend isn't reachable during `next build` (see `lib/server-api.ts`),
 * and a sitemap baked at build time would never list new dates.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    '',
    '/curated',
    '/hotspot',
    '/digest',
    '/keywords',
    '/agent',
    '/about',
    '/changelog',
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === '/digest' ? 'daily' : route === '/curated' || route === '/hotspot' ? 'hourly' : 'weekly',
    priority: route === '' || route === '/curated' ? 1 : route === '/digest' ? 0.9 : 0.8,
  }));

  // Each published digest is its own citable URL, so list them individually.
  // Returns [] when the backend is unreachable, leaving the static entries intact.
  const recent = await fetchRecentDigestsSSR();
  const digestEntries: MetadataRoute.Sitemap = recent.map(({ date, createdAt }) => ({
    url: `${siteUrl}/digest/${date}`,
    // Real publish time rather than "now" — tells crawlers when it last changed.
    lastModified: createdAt ? new Date(createdAt) : new Date(`${date}T00:00:00Z`),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Multi-source event pages (single-source ones are noindex and left out).
  const stories = await fetchStoryKeysSSR();
  const storyEntries: MetadataRoute.Sitemap = stories.map(({ clusterKey, lastUpdatedAt }) => ({
    url: `${siteUrl}/story/${clusterKey}`,
    lastModified: new Date(lastUpdatedAt),
    changeFrequency: 'daily',
    priority: 0.6,
  }));

  return [...staticEntries, ...digestEntries, ...storyEntries];
}
