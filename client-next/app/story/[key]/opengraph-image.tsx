import { fetchStorySSR } from '@/lib/server-api';
import { renderOgCard, ogSourceCountColor, OG_SIZE } from '@/lib/og';
import { displayTitle } from '@/lib/utils';

export const alt = 'AI 热点雷达 事件详情';
export const size = OG_SIZE;
export const contentType = 'image/png';

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' });

export default async function Image({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const story = /^[\w-]{3,64}$/.test(key) ? await fetchStorySSR(key) : null;
  if (!story) {
    return renderOgCard({ kicker: '热点事件', title: '这个事件不存在或已过期' });
  }
  return renderOgCard({
    kicker: '热点事件',
    title: story.digest?.title || displayTitle(story.main),
    meta: [`${story.reportCount} 篇报道`, `${fmtDay(story.lastUpdatedAt)}更新`],
    stat: { value: String(story.sourceCount), label: '家来源报道', color: ogSourceCountColor(story.sourceCount) },
  });
}
