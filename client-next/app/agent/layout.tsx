import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: 'AI 资讯 API、RSS 与 Agent 接入',
  description: '免费接入 AI 热点雷达 的 AI 日报、热点榜、事件详情、主题动态、精选与搜索：Claude Code 等 AI 助手一句话安装 Skill，也可用 RSS 订阅或免认证 JSON 接口。',
  openGraph: { ...ogImages,
    title: 'AI 资讯 API、RSS 与 Agent 接入',
    description: '一句话安装 Skill，或用 RSS、JSON 接口接入 AI 热点雷达 的 AI 日报与热点',
  },
  twitter: { ...twitterImages,
    title: 'AI 资讯 API、RSS 与 Agent 接入',
    description: '一句话安装 Skill，或用 RSS、JSON 接口接入 AI 热点雷达 的 AI 日报与热点',
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
