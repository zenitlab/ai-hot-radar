import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

export default function sitemap(): MetadataRoute.Sitemap {
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

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/digest' ? 'daily' : route === '/curated' || route === '/hotspot' ? 'hourly' : 'weekly',
    priority: route === '' || route === '/curated' ? 1 : route === '/digest' ? 0.9 : 0.8,
  }));
}
