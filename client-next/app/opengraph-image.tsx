import { renderOgCard, OG_SIZE } from '@/lib/og';

/** Site-wide default share image (replaces the 1×1 placeholder og-image.png). */
export const alt = 'AI Hot Radar · AI 热点雷达';
export const size = OG_SIZE;
export const contentType = 'image/png';
// Rendered per request, not at build: the CJK font subset is fetched from
// Google Fonts, and a failed fetch inside the Docker build would otherwise bake
// a card with missing glyphs into the image permanently.
export const dynamic = 'force-dynamic';

export default async function Image() {
  return renderOgCard({
    kicker: 'AI Hot Radar · AI 热点雷达',
    title: '实时聚合 20+ AI 信息源，AI 评分精选，每日日报',
    meta: '多源热议 · 事件时间线 · 推荐理由',
  });
}
