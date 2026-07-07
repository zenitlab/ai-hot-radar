import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 日报',
  description: '每日早上 8:00 自动生成的 AI 行业日报。覆盖模型发布、产品更新、行业动态、论文速递、社区讨论六大板块，一份日报读懂 AI 圈昨天发生了什么。',
  openGraph: {
    title: 'AI 日报 | AI Hot Radar',
    description: '每日 AI 行业日报，6 大板块全面覆盖',
  },
  twitter: {
    title: 'AI 日报 | AI Hot Radar',
    description: '每日 AI 行业日报，6 大板块全面覆盖',
  },
  alternates: {
    canonical: '/digest',
  },
};

export default function DigestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
