import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

/**
 * Generated robots.txt (replaces public/robots.txt).
 *
 * A crawler obeys only the most specific User-agent group that matches it, so
 * every named bot gets the same rules as `*` — the old file gave named bots a
 * bare `Allow: /`, silently dropping the /api/ rules for them.
 *
 * - /_next/static/ is NOT disallowed: Googlebot needs JS/CSS to render pages.
 * - Public agent/feed endpoints listed in llms.txt and ai.txt are allowed;
 *   the rest of /api/ (internal, write endpoints) stays off-limits.
 */
const RULES = {
  allow: ['/', '/api/agent/', '/api/hotspots/trending'],
  disallow: ['/api/', '/keywords'],
};

// International AI / answer engines and Chinese search / AI crawlers. Listed
// explicitly so the intent is visible; they receive the same rules as `*`.
const NAMED_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'meta-externalagent', 'Amazonbot', 'CCBot',
  // 中文搜索与 AI 引擎：百度（文心）、字节（豆包/头条）、搜狗（元宝）、神马/夸克（通义）、360
  'Baiduspider', 'Bytespider', 'Sogou web spider', 'YisouSpider', '360Spider',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', ...RULES },
      { userAgent: NAMED_BOTS, ...RULES },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
