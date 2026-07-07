/**
 * JSON-LD structured data components for SEO.
 * Based on schema.org standards used by Google, Bing, etc.
 */

export function OrganizationSchema() {
  const schema = {
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebSiteSchema() {
  const schema = {
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ArticleSchema({
  headline,
  description,
  datePublished,
  dateModified,
  author = 'AI Hot Radar',
}: {
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline,
    description,
    author: {
      '@type': 'Organization',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'AI Hot Radar',
      logo: {
        '@type': 'ImageObject',
        url: 'https://aihotradar.com/radar.svg',
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
