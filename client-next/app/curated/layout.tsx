import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: '精选资讯',
  description: '经 AI 五维评分筛选的高质量 AI 资讯，每条都值得读。覆盖 OpenAI、Anthropic、Google AI 等官方动态，arXiv 最新论文，行业分析与产品发布。',
  openGraph: { ...ogImages,
    title: '精选资讯 | AI Hot Radar',
    description: '经 AI 五维评分筛选的高质量 AI 资讯',
  },
  twitter: { ...twitterImages,
    title: '精选资讯 | AI Hot Radar',
    description: '经 AI 五维评分筛选的高质量 AI 资讯',
  },
  alternates: {
    canonical: '/curated',
  },
};

export default function CuratedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
