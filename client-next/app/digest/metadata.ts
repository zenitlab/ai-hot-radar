import type { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aihotradar.com';

export const metadata: Metadata = {
  title: 'AI 日报',
  description: '每日 8:00 自动生成的 AI 行业日报，涵盖今日重点、模型情报、国内外动态、AI 产品、社区热议、论文趋势六大板块。',
  openGraph: {
    title: 'AI 日报 | AI Hot Radar',
    description: '每日 AI 行业动态精选：模型发布、产品更新、论文趋势、社区热议',
    url: `${siteUrl}/digest`,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI 日报 | AI Hot Radar',
    description: '每日 AI 行业动态精选：模型发布、产品更新、论文趋势、社区热议',
  },
};
