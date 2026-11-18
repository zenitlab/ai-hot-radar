import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: { absolute: '关于 AI 热点雷达（AI Hot Radar）：AI 新闻聚合与精选' },
  description: 'AI 热点雷达（AI Hot Radar）是开源的 AI 资讯聚合工具，每 30 分钟从 70 多个信息源抓取最新资讯，用 AI 评分筛掉噪音，整理成精选、热点榜、主题和 AI 日报；附信源清单、内容写作方法与版权说明。',
  openGraph: { ...ogImages,
    title: '关于 AI 热点雷达（AI Hot Radar）：AI 新闻聚合与精选',
    description: '开源的 AI 资讯聚合工具：AI 评分精选、热点榜、主题与每日 AI 日报',
  },
  twitter: { ...twitterImages,
    title: '关于 AI 热点雷达（AI Hot Radar）：AI 新闻聚合与精选',
    description: '开源的 AI 资讯聚合工具：AI 评分精选、热点榜、主题与每日 AI 日报',
  },
  alternates: {
    canonical: '/about',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
