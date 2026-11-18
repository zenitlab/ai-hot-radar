import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: '我的关注：只看你关心的 AI 公司和方向',
  description: '关注 OpenAI、Anthropic、DeepSeek 等公司和 Agent、AI 编程等方向，把它们的最新资讯合在一起按时间看，不用登录。',
  openGraph: { ...ogImages,
    title: '我的关注：只看你关心的 AI 公司和方向',
    description: '关注几个公司和技术方向，最新资讯合在一起看',
  },
  twitter: { ...twitterImages,
    title: '我的关注：只看你关心的 AI 公司和方向',
    description: '关注几个公司和技术方向，最新资讯合在一起看',
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
