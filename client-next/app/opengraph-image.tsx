import { renderOgCard, OG_SIZE } from '@/lib/og';

/** Site-wide default share image (replaces the 1×1 placeholder og-image.png). */
export const alt = 'AI 热点雷达：70 多个信息源实时聚合 AI 资讯';
export const size = OG_SIZE;
export const contentType = 'image/png';
// Rendered per request, not at build: the CJK font subset is fetched from
// Google Fonts, and a failed fetch inside the Docker build would otherwise bake
// a card with missing glyphs into the image permanently.
export const dynamic = 'force-dynamic';

export default async function Image() {
  return renderOgCard({
    title: '70 多个信息源实时聚合 AI 资讯，AI 评分精选，每天早上出日报',
    meta: ['热点榜', '事件时间线', '主题', 'AI 日报'],
  });
}
