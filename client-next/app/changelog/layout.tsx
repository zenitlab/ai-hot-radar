import { Metadata } from 'next';
import { ogImages, twitterImages } from '@/lib/og-meta';

export const metadata: Metadata = {
  title: '更新日志',
  description: 'AI Hot Radar 功能更新、Bug 修复与性能优化记录。追踪产品迭代历史，了解最新版本改进。',
  openGraph: { ...ogImages,
    title: '更新日志 | AI Hot Radar',
    description: 'AI Hot Radar 功能更新、Bug 修复与性能优化记录',
  },
  twitter: { ...twitterImages,
    title: '更新日志 | AI Hot Radar',
    description: 'AI Hot Radar 功能更新、Bug 修复与性能优化记录',
  },
  alternates: {
    canonical: '/changelog',
  },
};

export default function ChangelogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
