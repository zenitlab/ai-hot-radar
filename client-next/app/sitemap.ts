import { MetadataRoute } from 'next';

import { fetchItemIdsSSR, fetchRecentDigestsSSR, fetchStoryKeysSSR, fetchTopicSlugsSSR } from '@/lib/server-api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

/**
 * Generated per request so newly published digests appear without a rebuild —
 * the backend isn't reachable during `next build` (see `lib/server-api.ts`),
 * and a sitemap baked at build time would never list new dates.
 */
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // `/` only redirects to /curated, and /keywords is disallowed in robots.ts;
  // listing either sends crawlers a URL they can't index.
  const routes = [
    '/curated',
    '/hot',
    '/hotspot',
    '/topics',
    '/digest',
    '/agent',
    '/about',
    '/changelog',
  ];

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === '/digest' || route === '/topics' ? 'daily' : route === '/curated' || route === '/hot' || route === '/hotspot' ? 'hourly' : 'weekly',
    priority: route === '/curated' ? 1 : route === '/digest' ? 0.9 : 0.8,
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

  // Curated item pages with a summary (others are noindex and left out).
  const items = await fetchItemIdsSSR();
  const itemEntries: MetadataRoute.Sitemap = items.map(({ id, lastUpdatedAt }) => ({
    url: `${siteUrl}/items/${id}`,
    lastModified: new Date(lastUpdatedAt),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  // Topic pages with enough items (thin ones are noindex and left out).
  const topics = await fetchTopicSlugsSSR();
  const topicEntries: MetadataRoute.Sitemap = topics.map(({ slug, lastUpdatedAt }) => ({
    url: `${siteUrl}/topics/${slug}`,
    lastModified: new Date(lastUpdatedAt),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticEntries, ...digestEntries, ...topicEntries, ...storyEntries, ...itemEntries];
}
