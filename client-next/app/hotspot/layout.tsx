import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
  description: 'AI 全部动态：70 多个信息源每 30 分钟抓取的 AI 资讯，不做精选筛选，附 AI 评出的重要度、热度与真伪判断，同一事件多源去重。',
  openGraph: { ...ogImages,
    title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
    description: '70 多个信息源每 30 分钟抓取的全部 AI 资讯',
  },
  twitter: { ...twitterImages,
    title: 'AI 资讯实时动态：全部 AI 新闻滚动更新',
    description: '70 多个信息源每 30 分钟抓取的全部 AI 资讯',
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
