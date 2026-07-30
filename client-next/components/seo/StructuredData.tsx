/**
 * JSON-LD structured data components for SEO.
 * Based on schema.org standards used by Google, Bing, etc.
 */

import { safeJsonLd } from '../../lib/structured-data';

// Static schemas live at module scope so they are never rebuilt on re-render.
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AI Hot Radar',
  alternateName: 'AI 热点雷达',
  url: 'https://aihotradar.com',
  logo: 'https://aihotradar.com/radar.svg',
  description: '实时聚合 AI 资讯，AI 评分精选，自动生成日报',
  foundingDate: '2026',
  sameAs: [
    'https://github.com/zenitlab/ai-hot-radar',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'gundam_zzc@126.com',
    contactType: 'Customer Service',
  },
};

export function OrganizationSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
    />
  );
}

const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AI Hot Radar',
  alternateName: 'AI 热点雷达',
  url: 'https://aihotradar.com',
  description: '实时聚合 AI 资讯，AI 评分精选，自动生成日报',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://aihotradar.com/keywords?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export function WebSiteSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(webSiteSchema) }}
    />
  );
}
