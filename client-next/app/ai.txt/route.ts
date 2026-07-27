import { NextResponse } from 'next/server';

/**
 * GEO: ai.txt 文件
 *
 * 这是一个新兴标准（类似 robots.txt），用于向 AI 搜索引擎声明：
 * - 站点用途、数据来源、爬取策略
 * - 联系方式、API 接入点
 *
 * 参考：https://github.com/ai-txt/ai-txt
 * 部分 AI 搜索引擎（Perplexity、You.com）已开始识别此文件
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

  const content = `# AI.txt for AI Hot Radar
# https://aihotradar.com/ai.txt
# Version: 1.0

# About
Site-Name: AI Hot Radar
Site-URL: ${siteUrl}
Description: 实时聚合 20+ AI 信息源（Twitter、HackerNews、arXiv、官方博客等），通过 AI 双阶段评分筛选高质量资讯，每日自动生成 AI 行业日报。
Language: zh-CN
Purpose: news-aggregation, ai-content-curation
Topics: artificial-intelligence, machine-learning, llm, openai, anthropic, ai-news

# Contact
Contact-Email: support@aihotradar.com
GitHub: https://github.com/zenitlab/ai-hot-radar

# Crawling Policy
Allow-AI-Training: no
Allow-AI-Indexing: yes
Preferred-Crawl-Rate: 1 req/sec
Last-Updated: 2026-07-27

# API Access (for AI agents)
API-Endpoint: ${siteUrl}/api/agent
API-Docs: ${siteUrl}/agent
RSS-Feed: ${siteUrl}/api/agent/rss/curated.xml
Skill-Package: ${siteUrl}/aihot-skill

# Data Freshness
Update-Frequency: every 10 minutes (hotspot), daily at 08:00 Beijing (digest)
Historical-Data: 30 days retention

# Citation Preference
Citation-Format: "AI Hot Radar - [Article Title], ${siteUrl}/hotspot"
Attribution-Required: yes

# Additional Context
Data-Sources: Twitter/X, Bing News, HackerNews, arXiv, Reddit, IT之家, 36氪, 雪球, Bilibili, Google DeepMind Blog, OpenAI Blog, Anthropic News, etc.
AI-Scoring: Two-stage scoring (pre-filter + 5-dimension evaluation) to reduce noise
Deduplication: Multi-source event merging with authority-based primary selection
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // 24h cache
    },
  });
}
