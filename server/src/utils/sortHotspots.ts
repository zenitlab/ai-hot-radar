/**
 * 热点排序工具函数
 * 供后端路由和前端客户端排序共用
 */

export interface SortableHotspot {
  likeCount: number | null;
  retweetCount: number | null;
  viewCount: number | null;
  importance: string;
  relevance: number;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

/** 重要程度数值映射，数值越小越重要 */
export const IMPORTANCE_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * 计算热度综合分数
 *
 * 公式设计说明：
 * - 点赞为主要排序依据，权重最高
 * - 转发权重次之
 * - 浏览量用 log10 对数缩放作为辅助信号
 *
 * 前端以闪电图标 (⚡) 展示 likeCount，用户直觉上以此判断热度，
 * 因此 likeCount 必须是主导因素。
 */
export function calcHotScore(item: SortableHotspot): number {
  const likes = item.likeCount || 0;
  const retweets = item.retweetCount || 0;
  const views = item.viewCount || 0;

  return likes * 10 + retweets * 5 + Math.log10(Math.max(views, 1)) * 2;
}

/**
 * 比较两个热点的重要程度
 * 返回负数 = a 更重要，正数 = b 更重要，0 = 相同
 */
export function compareImportance(a: SortableHotspot, b: SortableHotspot): number {
  return (IMPORTANCE_ORDER[a.importance] ?? 4) - (IMPORTANCE_ORDER[b.importance] ?? 4);
}

/**
 * 获取时间戳（毫秒），兼容 Date 对象和 ISO 字符串
 */
function toTimestamp(d: Date | string | null): number {
  if (!d) return 0;
  return typeof d === 'string' ? new Date(d).getTime() : d.getTime();
}

/**
 * 通用排序函数
 * @param items - 热点数组（会被复制，不修改原数组）
 * @param sortBy - 排序字段
 * @param sortOrder - 排序方向 'asc' | 'desc'
 * @returns 排序后的新数组
 */
export function sortHotspots<T extends SortableHotspot>(
  items: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
  const sorted = [...items];
  const desc = sortOrder === 'desc';

  sorted.sort((a, b) => {
    let result: number;

    switch (sortBy) {
      case 'publishedAt': {
        const ta = toTimestamp(a.publishedAt);
        const tb = toTimestamp(b.publishedAt);
        result = ta - tb;
        // 如果发布时间相同或都为空，按创建时间倒序
        if (result === 0) {
          result = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
        }
        break;
      }

      case 'importance': {
        result = compareImportance(a, b);
        // 重要性相同时，按创建时间倒序兜底
        if (result === 0) {
          result = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
          // 对兜底时间也应用 desc
          return desc ? -(result) : result;
        }
        // importance 的 "desc" 含义是"最重要在前"
        // IMPORTANCE_ORDER 已经是 urgent=0 < low=3
        // 所以 result < 0 意味着 a 更重要
        // desc 时我们要 a 在前，即返回负数 → 直接返回 result
        // asc 时我们要 a 在后，即返回正数 → 返回 -result
        return desc ? result : -result;
      }

      case 'relevance':
        result = a.relevance - b.relevance;
        break;

      case 'hot':
        result = calcHotScore(a) - calcHotScore(b);
        break;

      default: // createdAt
        result = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
        break;
    }

    return desc ? -(result) : result;
  });

  return sorted;
}
