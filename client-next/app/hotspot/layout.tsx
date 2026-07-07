import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '热点雷达',
  description: 'AI 热点实时监控雷达，20+ 信息源每 10 分钟抓取，AI 双阶段评分识别真伪与重要度，同事件多源去重。追踪 AI 行业最新动态，不错过任何重要突破。',
  openGraph: {
    title: '热点雷达 | AI Hot Radar',
    description: 'AI 热点实时监控，20+ 信息源每 10 分钟抓取',
  },
  twitter: {
    title: '热点雷达 | AI Hot Radar',
    description: 'AI 热点实时监控，20+ 信息源每 10 分钟抓取',
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
