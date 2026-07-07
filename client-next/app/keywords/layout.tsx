import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的关注',
  description: '订阅自定义关键词，AI 自动扩展同义词、判断真伪，重要热点 WebSocket 实时推送。让你关心的 AI 话题第一时间送达。',
  openGraph: {
    title: '我的关注 | AI Hot Radar',
    description: '订阅 AI 关键词，实时推送重要热点',
  },
  twitter: {
    title: '我的关注 | AI Hot Radar',
    description: '订阅 AI 关键词，实时推送重要热点',
  },
  alternates: {
    canonical: '/keywords',
  },
};

export default function KeywordsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
