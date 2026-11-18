import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  // Homepage: the brand leads, since that is what people search for. `absolute` skips the "| AI 热点雷达" suffix.
  title: { absolute: 'AI 热点雷达：今日 AI 新闻、热点与大模型动态精选' },
  description: '经 AI 五维评分筛选的高质量 AI 资讯，每条都值得读。覆盖 OpenAI、Anthropic、Google AI 等官方动态，arXiv 最新论文，行业分析与产品发布。',
  openGraph: { ...ogImages,
    title: 'AI 热点雷达：今日 AI 新闻、热点与大模型动态精选',
    description: '经 AI 五维评分筛选的高质量 AI 资讯',
  },
  twitter: { ...twitterImages,
    title: 'AI 热点雷达：今日 AI 新闻、热点与大模型动态精选',
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
