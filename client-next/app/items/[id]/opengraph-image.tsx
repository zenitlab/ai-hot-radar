import { fetchItemSSR } from '@/lib/server-api';
import { getSourceLabel } from '@/lib/sourceMeta';
import { CATEGORY_LABEL } from '@/lib/categories';
import { renderOgCard, ogSourceCountColor, OG_SIZE } from '@/lib/og';
import { displayTitle } from '@/lib/utils';

export const alt = 'AI 热点雷达 资讯详情';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await fetchItemSSR(id) : null;
  if (!d) {
    return renderOgCard({ kicker: '资讯', title: '这条资讯不存在或已过期' });
  }
  const { item } = d;
  const sources = d.story?.sourceCount ?? 1;
  return renderOgCard({
    kicker: item.isCurated ? '精选' : '资讯',
    title: displayTitle(item),
    meta: [getSourceLabel(item.source), item.category ? CATEGORY_LABEL[item.category] : ''],
    stat:
      sources > 1
        ? { value: String(sources), label: '家来源报道', color: ogSourceCountColor(sources) }
        : item.qualityScore != null
          ? { value: String(Math.round(item.qualityScore)), label: 'AI 评分' }
          : undefined,
  });
}
