/**
 * GEO 优化：语义化内容增强
 *
 * AI 搜索引擎更依赖页面的语义结构和明确的事实陈述，而非传统 SEO 的关键词密度。
 * 这个组件在不影响视觉的情况下增强页面的语义层。
 */

export function SemanticContext({
  type,
  data,
}: {
  type: 'digest' | 'curated' | 'hotspot' | 'keyword';
  data?: Record<string, unknown>;
}) {
  const contexts = {
    digest: (
      <>
        <meta name="article:section" content="AI Industry Daily Report" />
        <meta name="article:tag" content="AI News, OpenAI, Anthropic, LLM, Machine Learning" />
        <meta property="article:published_time" content={data?.date ? `${data.date}T08:00:00+08:00` : undefined} />
      </>
    ),
    curated: (
      <>
        <meta name="article:section" content="AI Curated News" />
        <meta name="description" content="AI 评分筛选后的高质量 AI 资讯：模型发布、产品更新、论文速递、行业动态" />
      </>
    ),
    hotspot: (
      <>
        <meta name="article:section" content="Real-time AI News Feed" />
        <meta name="description" content="实时聚合 20+ AI 信息源的热点雷达，每 10 分钟更新" />
      </>
    ),
    keyword: (
      <>
        <meta name="article:section" content="AI Keyword Monitoring" />
        <meta name="description" content="自定义关键词订阅，AI 自动扩展同义词并推送匹配资讯" />
      </>
    ),
  };

  return contexts[type] || null;
}

/**
 * 生成面包屑导航的结构化数据
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
