import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '关于',
  description: 'AI Hot Radar 是开源的 AI 资讯聚合工具，每 10 分钟从 20+ 信息源抓取最新资讯，通过两阶段 AI 评分筛掉噪音，沉淀到精选、热点雷达、AI 日报三个视图。',
  openGraph: {
    title: '关于 AI Hot Radar',
    description: '开源的 AI 资讯聚合工具，AI 评分精选，自动生成日报',
  },
  twitter: {
    title: '关于 AI Hot Radar',
    description: '开源的 AI 资讯聚合工具，AI 评分精选，自动生成日报',
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
