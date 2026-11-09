import { fetchItemSSR } from '@/lib/server-api';
import { getSourceLabel } from '@/lib/sourceMeta';
import { CATEGORY_LABEL } from '@/lib/categories';
import { renderOgCard, OG_SIZE } from '@/lib/og';

export const alt = 'AI Hot Radar 内容详情';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await fetchItemSSR(id) : null;
  if (!d) {
    return renderOgCard({ kicker: 'AI Hot Radar · 内容详情', title: '内容不存在或已过期' });
  }
  const { item } = d;
  const parts = [
    getSourceLabel(item.source),
    item.category ? CATEGORY_LABEL[item.category] : undefined,
    item.qualityScore != null ? `AI 评分 ${Math.round(item.qualityScore)}` : undefined,
  ].filter(Boolean);
  return renderOgCard({
    kicker: item.isCurated ? 'AI Hot Radar · 精选' : 'AI Hot Radar',
    title: item.title,
    meta: parts.join(' · '),
  });
}
