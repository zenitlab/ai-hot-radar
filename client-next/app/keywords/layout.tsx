import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: 'AI 关键词订阅：关注你关心的 AI 话题',
  description: '订阅自定义关键词，AI 自动扩展同义词、判断真伪，重要热点 WebSocket 实时推送。让你关心的 AI 话题第一时间送达。',
  openGraph: { ...ogImages,
    title: 'AI 关键词订阅：关注你关心的 AI 话题',
    description: '订阅 AI 关键词，实时推送重要热点',
  },
  twitter: { ...twitterImages,
    title: 'AI 关键词订阅：关注你关心的 AI 话题',
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
