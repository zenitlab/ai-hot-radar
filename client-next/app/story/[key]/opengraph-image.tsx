import { fetchStorySSR } from '@/lib/server-api';
import { renderOgCard, OG_SIZE } from '@/lib/og';

export const alt = 'AI Hot Radar 事件详情';
export const size = OG_SIZE;
export const contentType = 'image/png';

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' });

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const story = /^[\w-]{3,64}$/.test(key) ? await fetchStorySSR(key) : null;
  if (!story) {
    return renderOgCard({ kicker: 'AI Hot Radar · 事件详情', title: '事件不存在或已过期' });
  }
  return renderOgCard({
    kicker: 'AI Hot Radar · 多源热议',
    title: story.main.title,
    meta: `${story.sourceCount} 家来源 · ${story.reportCount} 篇报道 · ${fmtDay(story.lastUpdatedAt)}更新`,
  });
}
