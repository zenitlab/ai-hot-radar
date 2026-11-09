import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: 'Agent 接入',
  description: '通过 Skill / RSS / REST API 三种方式，让 Claude Code、Cursor、Feedly、企业 IM 都能接入 AI Hot Radar。获取精选资讯、AI 日报、关键词搜索能力。',
  openGraph: { ...ogImages,
    title: 'Agent 接入 | AI Hot Radar',
    description: 'Skill / RSS / API 三种方式接入 AI Hot Radar',
  },
  twitter: { ...twitterImages,
    title: 'Agent 接入 | AI Hot Radar',
    description: 'Skill / RSS / API 三种方式接入 AI Hot Radar',
  },
  alternates: {
    canonical: '/agent',
  },
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
