import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
  description: 'AI 热点实时监控雷达，20+ 信息源每 30 分钟抓取，AI 双阶段评分识别真伪与重要度，同事件多源去重。追踪 AI 行业最新动态，不错过任何重要突破。',
  openGraph: { ...ogImages,
    title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
    description: 'AI 热点实时监控，20+ 信息源每 30 分钟抓取',
  },
  twitter: { ...twitterImages,
    title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
    description: 'AI 热点实时监控，20+ 信息源每 30 分钟抓取',
  },
  alternates: {
    canonical: '/hotspot',
  },
};

export default function HotspotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
